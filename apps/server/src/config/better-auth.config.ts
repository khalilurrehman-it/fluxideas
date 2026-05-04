import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../database/database-connection.js";
import { serverEnvironment } from "./environment-variables.config.js";
import {
  authUsersTable,
  authSessionsTable,
  authAccountsTable,
  authVerificationsTable,
} from "../database/schema/auth.schema.js";

export const betterAuthInstance = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authUsersTable,
      session: authSessionsTable,
      account: authAccountsTable,
      verification: authVerificationsTable,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  secret: serverEnvironment.BETTER_AUTH_SECRET,
  baseURL: serverEnvironment.BETTER_AUTH_URL,
  trustedOrigins: [serverEnvironment.FRONTEND_URL],
  advanced: {
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,      // Refresh if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
});

export type BetterAuthInstance = typeof betterAuthInstance;
