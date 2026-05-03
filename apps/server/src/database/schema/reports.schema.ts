import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { authUsersTable } from "./auth.schema.js";
import { searchesTable } from "./searches.schema.js";

export const reportsTable = pgTable("reports", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  searchId: text("search_id")
    .notNull()
    .references(() => searchesTable.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => authUsersTable.id, { onDelete: "cascade" }),
  pdfDownloadUrl: text("pdf_download_url"),
  topValidatedProblems: jsonb("top_validated_problems"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export type ReportRecord = typeof reportsTable.$inferSelect;
export type NewReportRecord = typeof reportsTable.$inferInsert;
