import type { Locale } from "@/lib/enums";
import type { EmailTemplate } from "./types";

/**
 * Localised transactional email bodies. Georgian is primary; English is the
 * fallback for `locale: "en"` accounts. Copy lives here rather than inline in
 * business logic so it can be reviewed and translated in one place.
 */

interface Rendered {
  subject: string;
  heading: string;
  lines: string[];
  cta?: { label: string; url: string };
  footnote?: string;
}

type Payload = Record<string, string | number | undefined>;

const t = (locale: Locale, ka: string, en: string) => (locale === "en" ? en : ka);

export function renderTemplate(
  template: EmailTemplate,
  payload: Payload,
  locale: Locale,
  platformName: string,
): Rendered {
  const s = (k: string) => String(payload[k] ?? "");

  switch (template) {
    case "verifyEmail":
      return {
        subject: t(locale, `დაადასტურეთ ელფოსტა — ${platformName}`, `Verify your email — ${platformName}`),
        heading: t(locale, "მოგესალმებით!", "Welcome!"),
        lines: [
          t(
            locale,
            `${s("name")}, გმადლობთ რეგისტრაციისთვის. დაადასტურეთ ელფოსტა, რომ სრულად გამოიყენოთ ${platformName}.`,
            `${s("name")}, thanks for signing up. Confirm your email to get full access to ${platformName}.`,
          ),
        ],
        cta: { label: t(locale, "ელფოსტის დადასტურება", "Verify email"), url: s("url") },
        footnote: t(locale, "ბმული აქტიურია 24 საათი.", "This link is valid for 24 hours."),
      };

    case "passwordReset":
      return {
        subject: t(locale, "პაროლის აღდგენა", "Reset your password"),
        heading: t(locale, "პაროლის აღდგენა", "Reset your password"),
        lines: [
          t(
            locale,
            "მივიღეთ პაროლის აღდგენის მოთხოვნა. თუ ეს თქვენ არ იყავით, უბრალოდ დააიგნორეთ ეს წერილი.",
            "We received a request to reset your password. If this wasn't you, you can ignore this email.",
          ),
        ],
        cta: { label: t(locale, "ახალი პაროლის დაყენება", "Set a new password"), url: s("url") },
        footnote: t(locale, "ბმული აქტიურია 1 საათი.", "This link is valid for 1 hour."),
      };

    case "passwordChanged":
      return {
        subject: t(locale, "პაროლი შეიცვალა", "Your password was changed"),
        heading: t(locale, "პაროლი წარმატებით შეიცვალა", "Password changed"),
        lines: [
          t(
            locale,
            "თქვენი პაროლი შეიცვალა და ყველა მოწყობილობაზე სესია დასრულდა. თუ ეს თქვენ არ იყავით, დაუყოვნებლივ დაგვიკავშირდით.",
            "Your password was changed and all sessions were signed out. If this wasn't you, contact us immediately.",
          ),
        ],
      };

    case "welcome":
      return {
        subject: t(locale, `მოგესალმებით ${platformName}-ზე`, `Welcome to ${platformName}`),
        heading: t(locale, `მოგესალმებით, ${s("name")}!`, `Welcome, ${s("name")}!`),
        lines: [
          t(
            locale,
            "თქვენი ანგარიში მზადაა. აღმოაჩინეთ კურსები და დაიწყეთ სწავლა დღესვე.",
            "Your account is ready. Discover courses and start learning today.",
          ),
        ],
        cta: { label: t(locale, "კურსების დათვალიერება", "Browse courses"), url: s("url") },
      };

    case "purchaseReceipt":
      return {
        subject: t(locale, `შენაძენი დადასტურდა — ${s("courseTitle")}`, `Purchase confirmed — ${s("courseTitle")}`),
        heading: t(locale, "გადახდა მიღებულია", "Payment received"),
        lines: [
          t(locale, `კურსი: ${s("courseTitle")}`, `Course: ${s("courseTitle")}`),
          t(locale, `თანხა: ${s("amount")}`, `Amount: ${s("amount")}`),
          t(locale, `შეკვეთის ნომერი: ${s("reference")}`, `Order reference: ${s("reference")}`),
          t(locale, "კურსზე წვდომა გახსნილია.", "Your course access is now open."),
        ],
        cta: { label: t(locale, "სწავლის დაწყება", "Start learning"), url: s("url") },
      };

    case "courseSold":
      return {
        subject: t(locale, `ახალი გაყიდვა — ${s("courseTitle")}`, `New sale — ${s("courseTitle")}`),
        heading: t(locale, "გილოცავთ, ახალი გაყიდვა!", "Congratulations, a new sale!"),
        lines: [
          t(locale, `კურსი: ${s("courseTitle")}`, `Course: ${s("courseTitle")}`),
          t(locale, `გაყიდვის თანხა: ${s("amount")}`, `Sale amount: ${s("amount")}`),
          t(locale, `თქვენი შემოსავალი: ${s("earnings")}`, `Your earnings: ${s("earnings")}`),
        ],
        cta: { label: t(locale, "დეშბორდზე გადასვლა", "Open dashboard"), url: s("url") },
      };

    case "courseApproved":
      return {
        subject: t(locale, `კურსი დამტკიცდა — ${s("courseTitle")}`, `Course approved — ${s("courseTitle")}`),
        heading: t(locale, "კურსი დამტკიცებულია", "Your course was approved"),
        lines: [
          t(
            locale,
            `„${s("courseTitle")}" გამოქვეყნებულია და ხელმისაწვდომია სტუდენტებისთვის.`,
            `"${s("courseTitle")}" is published and available to students.`,
          ),
        ],
        cta: { label: t(locale, "კურსის ნახვა", "View course"), url: s("url") },
      };

    case "courseRejected":
      return {
        subject: t(locale, `კურსი საჭიროებს ცვლილებებს — ${s("courseTitle")}`, `Changes needed — ${s("courseTitle")}`),
        heading: t(locale, "კურსი ვერ დამტკიცდა", "Your course needs changes"),
        lines: [
          t(locale, `კურსი: ${s("courseTitle")}`, `Course: ${s("courseTitle")}`),
          t(locale, `მიზეზი: ${s("reason")}`, `Reason: ${s("reason")}`),
          t(
            locale,
            "შეიტანეთ ცვლილებები და ხელახლა გამოაგზავნეთ განხილვისთვის.",
            "Make the changes and resubmit for review.",
          ),
        ],
        cta: { label: t(locale, "კურსის რედაქტირება", "Edit course"), url: s("url") },
      };

    case "certificateIssued":
      return {
        subject: t(locale, "თქვენი სერტიფიკატი მზადაა", "Your certificate is ready"),
        heading: t(locale, "გილოცავთ კურსის დასრულებას!", "Congratulations on finishing!"),
        lines: [
          t(locale, `კურსი: ${s("courseTitle")}`, `Course: ${s("courseTitle")}`),
          t(locale, `სერტიფიკატის ID: ${s("code")}`, `Certificate ID: ${s("code")}`),
        ],
        cta: { label: t(locale, "სერტიფიკატის ნახვა", "View certificate"), url: s("url") },
      };

    case "payoutStatus":
      return {
        subject: t(locale, `გადარიცხვის სტატუსი — ${s("status")}`, `Payout ${s("status")}`),
        heading: t(locale, "გადარიცხვის განახლება", "Payout update"),
        lines: [
          t(locale, `თანხა: ${s("amount")}`, `Amount: ${s("amount")}`),
          t(locale, `სტატუსი: ${s("status")}`, `Status: ${s("status")}`),
          s("note") ? t(locale, `შენიშვნა: ${s("note")}`, `Note: ${s("note")}`) : "",
        ].filter(Boolean),
        cta: { label: t(locale, "გადარიცხვების ნახვა", "View payouts"), url: s("url") },
      };

    default:
      return {
        subject: s("subject") || platformName,
        heading: s("title") || platformName,
        lines: [s("body")].filter(Boolean),
        cta: s("url") ? { label: t(locale, "გახსნა", "Open"), url: s("url") } : undefined,
      };
  }
}

/**
 * Inline-styled HTML — email clients ignore <style> blocks and external CSS.
 * All interpolated values are HTML-escaped.
 */
export function renderHtml(r: Rendered, platformName: string, locale: Locale): string {
  const esc = (v: string) =>
    v
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const body = r.lines.map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#3b4453">${esc(l)}</p>`).join("");
  const cta = r.cta
    ? `<a href="${esc(r.cta.url)}" style="display:inline-block;margin-top:8px;padding:12px 22px;background:#3559f0;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:15px">${esc(r.cta.label)}</a>`
    : "";
  const foot = r.footnote
    ? `<p style="margin:20px 0 0;font-size:13px;color:#8a93a1">${esc(r.footnote)}</p>`
    : "";

  return `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(r.subject)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f7f8fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans Georgian',sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto">
    <tr><td style="padding:0 0 16px"><span style="font-size:18px;font-weight:700;color:#0d1117">${esc(platformName)}</span></td></tr>
    <tr><td style="background:#fff;border:1px solid #e6e8ee;border-radius:16px;padding:28px">
      <h1 style="margin:0 0 14px;font-size:21px;line-height:1.35;color:#0d1117">${esc(r.heading)}</h1>
      ${body}${cta}${foot}
    </td></tr>
    <tr><td style="padding:16px 4px;font-size:12px;color:#8a93a1">
      ${locale === "en" ? "You received this email because you have an account on" : "ეს წერილი მიიღეთ, რადგან გაქვთ ანგარიში პლატფორმაზე"} ${esc(platformName)}.
    </td></tr>
  </table>
</body></html>`;
}

export const renderText = (r: Rendered): string =>
  [r.heading, "", ...r.lines, r.cta ? `\n${r.cta.label}: ${r.cta.url}` : "", r.footnote ?? ""]
    .filter((l) => l !== undefined)
    .join("\n")
    .trim();
