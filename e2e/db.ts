import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/db/schema";

// Standalone pool for E2E seeding/cleanup. Reads DATABASE_URL directly (not via
// src/lib/env) so seeding needs only the connection string, and global-teardown
// can own pool.end() for a clean runner exit.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });
