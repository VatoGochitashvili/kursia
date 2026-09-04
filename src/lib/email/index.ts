import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { serializeObject } from "@/lib/json";
import type { Locale } from "@/lib/enums";
import type { EmailDriver, EmailMessage, EmailTemplate } from "./types";
import { renderHtml, renderTemplate, renderText } from "./templates";

export * from "./types";

/**
 * Email is queued to the EmailOutbox table first and delivered by a drain
 * step. A request path never blocks on SMTP, a provider outage cannot fail a
 * checkout, and every message that was supposed to go out is auditable.
 */

class LogEmailDriver implements EmailDriver {
  readonly name = "log";
  async send(message: EmailMessage) {
    console.info(
      `\n📧 [email:log] to=${message.to}\n   subject: ${message.subject}\n${message.text
        .split("\n")
        .map((l) => `   ${l}`)
        .join("\n")}\n`,
    );
    return { ok: true };
  }
}

class ResendEmailDriver implements EmailDriver {
  readonly name = "resend";
  async send(message: EmailMessage) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });
    return res.ok ? { ok: true } : { ok: false, error: `Resend ${res.status}: ${await res.text()}` };
  }
}

class SmtpEmailDriver implements EmailDriver {
  readonly name = "smtp";
  async send(): Promise<{ ok: boolean; error?: string }> {
    // SMTP needs a socket client (nodemailer). Kept out of dependencies until
    // it is actually chosen — install nodemailer and implement here.
    return {
      ok: false,
      error:
        "EMAIL_DRIVER=smtp is not wired up. Install nodemailer and implement SmtpEmailDriver.send(), or use EMAIL_DRIVER=resend.",
    };
  }
}

function driver(): EmailDriver {
  switch (env.EMAIL_DRIVER) {
    case "resend":
      return new ResendEmailDriver();
    case "smtp":
      return new SmtpEmailDriver();
    default:
      return new LogEmailDriver();
  }
}

export interface QueueEmailInput {
  to: string;
  template: EmailTemplate;
  payload: Record<string, string | number | undefined>;
  locale?: Locale;
}

/** Enqueue a message. Never throws — email must not break a business flow. */
export async function queueEmail(input: QueueEmailInput): Promise<void> {
  try {
    const settings = await getSettings();
    const locale = input.locale ?? "ka";
    const rendered = renderTemplate(
      input.template,
      input.payload,
      locale,
      locale === "en" ? settings.platformName : settings.platformNameKa,
    );
    await db.emailOutbox.create({
      data: {
        toEmail: input.to,
        subject: rendered.subject,
        template: input.template,
        payload: serializeObject(input.payload) ?? "{}",
        locale,
      },
    });
  } catch (error) {
    console.error("[email] failed to queue", input.template, error);
  }
}

/**
 * Deliver queued messages. Call from a cron route (/api/cron/email) or a
 * worker. Returns counts so the caller can log/alert.
 */
export async function drainOutbox(limit = 25): Promise<{ sent: number; failed: number }> {
  const settings = await getSettings();
  const d = driver();
  const pending = await db.emailOutbox.findMany({
    where: { status: "QUEUED", attempts: { lt: 5 } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = 0;
  let failed = 0;

  for (const row of pending) {
    const locale = (row.locale === "en" ? "en" : "ka") as Locale;
    let payload: Record<string, string | number | undefined> = {};
    try {
      payload = JSON.parse(row.payload);
    } catch {
      payload = {};
    }

    const platformName = locale === "en" ? settings.platformName : settings.platformNameKa;
    const rendered = renderTemplate(row.template as EmailTemplate, payload, locale, platformName);
    const result = await d.send({
      to: row.toEmail,
      subject: rendered.subject,
      html: renderHtml(rendered, platformName, locale),
      text: renderText(rendered),
    });

    if (result.ok) {
      sent++;
      await db.emailOutbox.update({
        where: { id: row.id },
        data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 } },
      });
    } else {
      failed++;
      const attempts = row.attempts + 1;
      await db.emailOutbox.update({
        where: { id: row.id },
        data: {
          status: attempts >= 5 ? "FAILED" : "QUEUED",
          attempts,
          lastError: result.error?.slice(0, 1000) ?? "unknown error",
        },
      });
    }
  }

  return { sent, failed };
}
