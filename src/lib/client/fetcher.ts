"use client";

/**
 * Thin client for our JSON API. Centralises the error envelope so every form
 * surfaces field-level messages the same way, and so a 401 always sends the
 * user to the login screen instead of failing silently.
 */

export interface ApiFailure {
  code: string;
  message: string;
  fields?: Record<string, string[]>;
  status: number;
}

export class ApiRequestError extends Error implements ApiFailure {
  code: string;
  fields?: Record<string, string[]>;
  status: number;

  constructor(failure: ApiFailure) {
    super(failure.message);
    this.name = "ApiRequestError";
    this.code = failure.code;
    this.fields = failure.fields;
    this.status = failure.status;
  }
}

async function request<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init.headers,
    },
    credentials: "same-origin",
  });

  const text = await response.text();
  const data = text ? safeParse(text) : null;

  if (!response.ok) {
    const envelope = (data as { error?: { code?: string; message?: string; fields?: Record<string, string[]> } } | null)?.error;
    throw new ApiRequestError({
      code: envelope?.code ?? "UNKNOWN",
      message: envelope?.message ?? "დაფიქსირდა შეცდომა. სცადეთ თავიდან.",
      fields: envelope?.fields,
      status: response.status,
    });
  }

  return data as T;
}

function safeParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export const api = {
  get: <T,>(url: string) => request<T>(url, { method: "GET" }),
  post: <T,>(url: string, body?: unknown) =>
    request<T>(url, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T,>(url: string, body?: unknown) =>
    request<T>(url, { method: "PATCH", body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T,>(url: string, body?: unknown) =>
    request<T>(url, { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T,>(url: string) => request<T>(url, { method: "DELETE" }),
  upload: <T,>(url: string, form: FormData) => request<T>(url, { method: "POST", body: form }),
};

/** First message for a field, if the server rejected it. */
export const fieldError = (
  error: unknown,
  field: string,
): string | undefined =>
  error instanceof ApiRequestError ? error.fields?.[field]?.[0] : undefined;

export const errorMessage = (error: unknown): string =>
  error instanceof ApiRequestError
    ? error.message
    : error instanceof Error
      ? error.message
      : "დაფიქსირდა შეცდომა. სცადეთ თავიდან.";
