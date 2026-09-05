import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Health probe for the platform's load balancer / container orchestrator.
 *
 * It actually touches the database rather than just returning 200: a process
 * that is up but cannot reach Postgres should be pulled out of rotation, not
 * sent traffic. Kept deliberately cheap (`SELECT 1`) so a probe every few
 * seconds costs nothing.
 *
 * Returns no version, environment or connection details — a public endpoint
 * should not describe the deployment to anyone who curls it.
 */
export async function GET(): Promise<Response> {
  const startedAt = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json(
      { status: "ok", db: "up", latencyMs: Date.now() - startedAt },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "degraded", db: "down" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
