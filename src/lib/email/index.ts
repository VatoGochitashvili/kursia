import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { serializeObject } from "@/lib/json";
import type { Locale } from "@/lib/enums";
import type { EmailDriver, EmailMessage, EmailTemplate } from "./types";
import { renderHtml, renderTemplate, renderText } from "./templates";
import nodemailer, { type Transporter } from "nodemailer";

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

/**
 * Any SMTP server: Gmail with an app password (free, fine for a few hundred
 * messages a day), Brevo, Resend's SMTP endpoint, or a mailbox at your own
 * domain. Port 465 is implicit TLS; anything else upgrades with STARTTLS.
 *
 * One transport per process, so a burst of messages reuses the connection.
 */
let smtpTransport: Transporter | null = null;

class SmtpEmailDriver implements EmailDriver {
  readonly name = "smtp";
  async send(message: EmailMessage) {
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASSWORD) {
      return { ok: false, error: "SMTP_HOST, SMTP_USER and SMTP_PASSWORD must all be set" };
    }
    smtpTransport ??= nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    try {
      await smtpTransport.sendMail({
        // Gmail rewrites a From it does not own, so an unset EMAIL_FROM falls
        // back to the mailbox that is actually sending.
        from: env.EMAIL_FROM || env.SMTP_USER,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      return { ok: true };
    } catch (error) {
      // Never echo credentials: nodemailer's messages carry the server's
      // reply, not the password.
      return { ok: false, error: `SMTP: ${(error as Error).message}` };
    }
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
    const row = await db.emailOutbox.create({
      data: {
        toEmail: input.to,
        subject: rendered.subject,
        template: input.template,
        payload: serializeObject(input.payload) ?? "{}",
        locale,
      },
    });
    // Send now rather than waiting for the scheduled drain: a password reset
    // that arrives an hour later is a password reset that failed. If this
    // attempt fails, the row stays QUEUED and the drain retries it.
    await deliver(row, settings);
  } catch (error) {
    console.error("[email] failed to queue", input.template, error);
  }
}

type OutboxRow = Awaited<ReturnType<typeof db.emailOutbox.findMany>>[number];
type Settings = Awaited<ReturnType<typeof getSettings>>;

/** Send one outbox row and record the outcome. Returns whether it went out. */
async function deliver(row: OutboxRow, settings: Settings): Promise<boolean> {
  const locale = (row.locale === "en" ? "en" : "ka") as Locale;
  let payload: Record<string, string | number | undefined> = {};
  try {
    payload = JSON.parse(row.payload);
  } catch {
    payload = {};
  }

  const platformName = locale === "en" ? settings.platformName : settings.platformNameKa;
  const rendered = renderTemplate(row.template as EmailTemplate, payload, locale, platformName);
  const result = await driver().send({
    to: row.toEmail,
    subject: rendered.subject,
    html: renderHtml(rendered, platformName, locale),
    text: renderText(rendered),
  });

  if (result.ok) {
    await db.emailOutbox.update({
      where: { id: row.id },
      data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 } },
    });
    return true;
  }

  const attempts = row.attempts + 1;
  await db.emailOutbox.update({
    where: { id: row.id },
    data: {
      status: attempts >= 5 ? "FAILED" : "QUEUED",
      attempts,
      lastError: result.error?.slice(0, 1000) ?? "unknown error",
    },
  });
  console.error("[email] delivery failed", row.template, result.error);
  return false;
}

/**
 * Deliver queued messages. Call from a cron route (/api/cron/email) or a
 * worker. Returns counts so the caller can log/alert.
 */
export async function drainOutbox(limit = 25): Promise<{ sent: number; failed: number }> {
  const settings = await getSettings();
  const pending = await db.emailOutbox.findMany({
    where: { status: "QUEUED", attempts: { lt: 5 } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let sent = 0;
  let failed = 0;
  for (const row of pending) {
    if (await deliver(row, settings)) sent++;
    else failed++;
  }
  return { sent, failed };
}

/**
 * Send one real message to an administrator, bypassing the outbox.
 *
 * Configuring email is half credentials and half provider policy (Gmail wants
 * an app password, Resend wants a verified domain), and both fail in ways only
 * the provider's own reply explains. This hands that reply back to the person
 * setting it up instead of burying it in a log.
 */
export async function sendTestEmail(
  to: string,
  locale: Locale = "ka",
): Promise<{ ok: boolean; driver: string; error?: string }> {
  const settings = await getSettings();
  const platformName = locale === "en" ? settings.platformName : settings.platformNameKa;
  const rendered = renderTemplate(
    "welcome",
    { name: to, url: env.APP_URL },
    locale,
    platformName,
  );
  const d = driver();
  const result = await d.send({
    to,
    subject: rendered.subject,
    html: renderHtml(rendered, platformName, locale),
    text: renderText(rendered),
  });
  return { ok: result.ok, driver: d.name, error: result.error };
}
