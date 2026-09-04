import { beginMutation, handler, jsonOk, readJson } from "@/lib/api";
import { settingsUpdateSchema } from "@/lib/validation";
import { requireAdmin } from "@/lib/auth/rbac";
import { getSettings, updateSettings, type PlatformSettings } from "@/lib/settings";
import { percentToBps } from "@/lib/money";
import { toMinor } from "@/lib/money";
import { audit, AUDIT_ACTIONS } from "@/lib/audit";

export const runtime = "nodejs";

export const GET = handler(async () => {
  await requireAdmin();
  return jsonOk(await getSettings());
});

/**
 * Update platform configuration.
 *
 * Commission and payout minimums arrive in human units (percent, major
 * currency) and are converted to the storage units (basis points, minor units)
 * here, so the admin UI never has to know about either representation.
 * Every change is audited with a before/after diff.
 */
export const PATCH = handler(async (request) => {
  const admin = await requireAdmin();
  await beginMutation("write", admin.id);

  const body = await readJson(request, settingsUpdateSchema);
  const before = await getSettings();

  const patch: Partial<PlatformSettings> = {};
  const assign = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K] | undefined) => {
    if (value !== undefined) patch[key] = value;
  };

  assign("platformName", body.platformName);
  assign("platformNameKa", body.platformNameKa);
  assign("taglineKa", body.taglineKa);
  assign("taglineEn", body.taglineEn);
  assign("logoUrl", body.logoUrl);
  assign("supportEmail", body.supportEmail);
  assign("currency", body.currency);
  assign("payoutClearingDays", body.payoutClearingDays);
  assign("refundWindowDays", body.refundWindowDays);
  assign("courseApprovalRequired", body.courseApprovalRequired);
  assign("registrationOpen", body.registrationOpen);
  assign("creatorRegistrationOpen", body.creatorRegistrationOpen);
  assign("creatorAutoApprove", body.creatorAutoApprove);
  assign("homepageSections", body.homepageSections);
  assign("featuredCourseIds", body.featuredCourseIds);
  assign("featuredCreatorIds", body.featuredCreatorIds);
  assign("paymentProviders", body.paymentProviders);
  assign("defaultPaymentProvider", body.defaultPaymentProvider);
  assign("seoDefaultTitleKa", body.seoDefaultTitleKa);
  assign("seoDefaultDescriptionKa", body.seoDefaultDescriptionKa);

  if (body.commissionPercent !== undefined) {
    patch.commissionBps = percentToBps(body.commissionPercent);
  }
  if (body.payoutMinimum !== undefined) {
    patch.payoutMinimumMinor = toMinor(body.payoutMinimum, body.currency ?? before.currency);
  }

  const updated = await updateSettings(patch, admin.id);

  // Record only what actually changed, so the audit log stays readable.
  const changed = (Object.keys(patch) as (keyof PlatformSettings)[]).filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(updated[key]),
  );

  if (changed.length > 0) {
    await audit({
      actorId: admin.id,
      action: AUDIT_ACTIONS.SETTINGS_UPDATED,
      targetType: "PlatformSetting",
      summary: changed.join(", "),
      metadata: Object.fromEntries(
        changed.map((key) => [key, { from: before[key], to: updated[key] }]),
      ),
    });
  }

  return jsonOk(updated);
});
