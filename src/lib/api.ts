import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { ZodError, type ZodTypeAny, type output as ZodOutput } from "zod";
import { env } from "@/lib/env";
import { AuthError } from "@/lib/auth/rbac";
import { rateLimitRequest, type RateLimitName } from "@/lib/rate-limit";

/**
 * Shared plumbing for every route handler: one error envelope, one place that
 * decides HTTP status codes, origin checking for state-changing requests, and
 * schema validation of every body/query before it reaches business logic.
 *
 * The same handlers serve the web UI and any future native mobile client, so
 * responses are plain JSON with a stable shape.
 */

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string[]> };
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function jsonCreated<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  fields?: Record<string, string[]>,
) {
  return NextResponse.json<ApiErrorBody>({ error: { code, message, fields } }, { status });
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (message: string, fields?: Record<string, string[]>) =>
  new ApiError(400, "BAD_REQUEST", message, fields);
export const conflict = (message: string) => new ApiError(409, "CONFLICT", message);
export const notFoundError = (message = "ვერ მოიძებნა") =>
  new ApiError(404, "NOT_FOUND", message);
export const unprocessable = (message: string) =>
  new ApiError(422, "UNPROCESSABLE", message);

/**
 * CSRF defence. Session cookies are SameSite=Lax, which already blocks
 * cross-site POSTs from forms, and we additionally require the Origin/Referer
 * to match the app's own origin for every mutating request. This is the
 * standard double-check and needs no per-form token.
 */
export async function assertSameOrigin(): Promise<void> {
  const h = await headers();
  const origin = h.get("origin");
  const referer = h.get("referer");
  const source = origin ?? referer;

  // Non-browser clients (native app, server-to-server) send no Origin. They
  // authenticate with a bearer session and are not subject to CSRF.
  if (!source) return;

  const allowed = new Set([env.APP_URL]);
  const host = h.get("host");
  if (host) {
    allowed.add(`http://${host}`);
    allowed.add(`https://${host}`);
  }

  try {
    const url = new URL(source);
    const candidate = `${url.protocol}//${url.host}`;
    if (!allowed.has(candidate)) {
      throw new ApiError(403, "CSRF", "მოთხოვნა უცნობი წყაროდან");
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(403, "CSRF", "მოთხოვნა უცნობი წყაროდან");
  }
}

/**
 * Parse + validate a JSON body. Rejects anything the schema does not allow.
 * Generic over the schema (not the type) so `.default()` and `.transform()`
 * resolve to the parsed OUTPUT type rather than the looser input type.
 */
export async function readJson<S extends ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<ZodOutput<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw badRequest("არასწორი JSON მოთხოვნაში");
  }
  return parseOrThrow(schema, raw);
}

export function readQuery<S extends ZodTypeAny>(request: Request, schema: S): ZodOutput<S> {
  const params = new URL(request.url).searchParams;
  const obj: Record<string, string> = {};
  for (const [k, v] of params.entries()) obj[k] = v;
  return parseOrThrow(schema, obj);
}

export function parseOrThrow<S extends ZodTypeAny>(schema: S, value: unknown): ZodOutput<S> {
  const result = schema.safeParse(value);
  if (result.success) return result.data as ZodOutput<S>;
  throw badRequest("ვალიდაციის შეცდომა", flattenZod(result.error));
}

export function flattenZod(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

/** Apply a named rate-limit policy, throwing 429 with Retry-After. */
export async function guardRate(name: RateLimitName, userId?: string | null): Promise<void> {
  const result = await rateLimitRequest(name, userId);
  if (!result.ok) {
    throw new ApiError(
      429,
      "RATE_LIMITED",
      `ძალიან ბევრი მოთხოვნა. სცადეთ ${result.retryAfterSeconds} წამში.`,
    );
  }
}

/**
 * Wrap a route handler so thrown domain errors become correct HTTP responses
 * and unexpected errors never leak internals to the client.
 */
export function handler<C = unknown>(
  fn: (request: Request, context: C) => Promise<Response>,
) {
  return async (request: Request, context: C): Promise<Response> => {
    try {
      return await fn(request, context);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

export function toErrorResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return jsonError(error.status, error.code, error.message, error.fields);
  }
  if (error instanceof AuthError) {
    const status =
      error.code === "UNAUTHENTICATED" ? 401 : error.code === "FORBIDDEN" ? 403 : 404;
    return jsonError(status, error.code, error.message);
  }
  if (error instanceof ZodError) {
    return jsonError(400, "BAD_REQUEST", "ვალიდაციის შეცდომა", flattenZod(error));
  }

  // Prisma unique-constraint violation.
  const code = (error as { code?: string } | null)?.code;
  if (code === "P2002") {
    return jsonError(409, "CONFLICT", "ჩანაწერი უკვე არსებობს");
  }
  if (code === "P2025") {
    return jsonError(404, "NOT_FOUND", "ვერ მოიძებნა");
  }

  console.error("[api] unhandled error", error);
  return jsonError(500, "INTERNAL", "სერვერის შეცდომა. სცადეთ მოგვიანებით.");
}

/** Standard mutation preamble: same-origin check + rate limit. */
export async function beginMutation(name: RateLimitName, userId?: string | null) {
  await assertSameOrigin();
  await guardRate(name, userId);
}
