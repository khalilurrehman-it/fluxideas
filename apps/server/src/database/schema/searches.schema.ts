import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { authUsersTable } from "./auth.schema.js";

export const searchesTable = pgTable("searches", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => authUsersTable.id, { onDelete: "cascade" }),
  topicQuery: text("topic_query").notNull(),
  pipelineStatus: text("pipeline_status", {
    enum: ["pending", "scraping", "clustering", "validating", "generating", "done", "failed"],
  })
    .default("pending")
    .notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

export type SearchRecord = typeof searchesTable.$inferSelect;
export type NewSearchRecord = typeof searchesTable.$inferInsert;
