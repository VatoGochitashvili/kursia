export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailDriver {
  readonly name: string;
  send(message: EmailMessage): Promise<{ ok: boolean; error?: string }>;
}

/** Template keys — the payload shape for each lives in templates.ts. */
export const EMAIL_TEMPLATES = [
  "verifyEmail",
  "passwordReset",
  "passwordChanged",
  "welcome",
  "purchaseReceipt",
  "courseSold",
  "courseApproved",
  "courseRejected",
  "certificateIssued",
  "payoutStatus",
  "genericNotification",
] as const;

export type EmailTemplate = (typeof EMAIL_TEMPLATES)[number];
