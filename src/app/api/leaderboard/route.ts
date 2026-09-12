import { ApiError, handler, jsonOk } from "@/lib/api";
import { getSessionUser } from "@/lib/auth/session";
import { getMembership } from "@/lib/community";
import { getStanding, loadLeaderboard, type LeaderboardWindow } from "@/lib/points";

export const runtime = "nodejs";

const WINDOWS: LeaderboardWindow[] = ["7d", "30d", "all"];

/**
 * A community's leaderboard.
 *
 * Members only, from the same `getMembership` as the feed and the calendar —
 * a board naming a creator's paying students, with their avatars, is not
 * something to hand to a stranger with a creator id.
 */
export const GET = handler(async (request) => {
  const url = new URL(request.url);
  const creatorId = url.searchParams.get("creatorId") ?? "";
  const requested = url.searchParams.get("window") ?? "7d";
  const window: LeaderboardWindow = WINDOWS.includes(requested as LeaderboardWindow)
    ? (requested as LeaderboardWindow)
    : "7d";

  const viewer = await getSessionUser();
  const membership = await getMembership(viewer?.id ?? null, creatorId);
  if (!membership.isMember) {
    throw new ApiError(403, "FORBIDDEN", "ეს სივრცე მხოლოდ სტუდენტებისთვისაა");
  }

  const [board, standing] = await Promise.all([
    loadLeaderboard({ creatorId, window, viewerId: viewer?.id ?? null }),
    viewer ? getStanding(creatorId, viewer.id) : Promise.resolve(null),
  ]);

  return jsonOk({ ...board, window, standing, membership });
});
