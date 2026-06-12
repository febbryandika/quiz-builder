import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { env } from "@/lib/env";

// Rate limiting (SPEC §7): built-in defaults — enabled in production,
// 100 req/60s global, 3 req/10s on /sign-in/email. No config needed.
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: { enabled: true },
  plugins: [nextCookies()], // nextCookies must stay last
});
