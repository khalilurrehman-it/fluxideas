import { fromNodeHeaders } from "better-auth/node";
import type { IncomingHttpHeaders } from "http";
import { betterAuthInstance } from "../../config/better-auth.config.js";
import { db } from "../../database/database-connection.js";
import { authUsersTable } from "../../database/schema/auth.schema.js";
import { eq } from "drizzle-orm";

export async function getAuthenticatedSessionFromRequestHeaders(
  requestHeaders: IncomingHttpHeaders,
) {
  return betterAuthInstance.api.getSession({
    headers: fromNodeHeaders(requestHeaders),
  });
}

export async function checkEmailExists(email: string): Promise<boolean> {
  const user = await db
    .select({ id: authUsersTable.id })
    .from(authUsersTable)
    .where(eq(authUsersTable.email, email.toLowerCase().trim()))
    .limit(1);
  return user.length > 0;
}
