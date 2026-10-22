import { PrismaD1 } from "@prisma/adapter-d1";
import { PrismaClient } from "@prisma/client";

/**
 * Create Prisma client per request. Cloudflare Workers can reuse one isolate
 * across requests, but sharing PrismaD1 clients between those requests can
 * leave later D1 queries waiting forever.
 */
export function getDb(binding: D1Database) {
  return new PrismaClient({ adapter: new PrismaD1(binding) });
}

export type Db = ReturnType<typeof getDb>;
