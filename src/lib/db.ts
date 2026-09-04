import { PrismaClient } from "@prisma/client";
import { isDev } from "./env";

/**
 * One Prisma client per process. Next.js dev hot-reload re-evaluates modules,
 * so the instance is cached on globalThis to avoid exhausting connections.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: isDev ? ["warn", "error"] : ["error"] });

if (isDev) globalForPrisma.prisma = db;
