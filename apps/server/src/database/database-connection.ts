import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { databaseConnectionUrl } from "../config/database.config.js";
import * as authSchema from "./schema/auth.schema.js";
import * as searchesSchema from "./schema/searches.schema.js";
import * as reportsSchema from "./schema/reports.schema.js";

const fullDatabaseSchema = {
  ...authSchema,
  ...searchesSchema,
  ...reportsSchema,
};

const postgresConnection = postgres(databaseConnectionUrl, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
});

export const db = drizzle(postgresConnection, { schema: fullDatabaseSchema });

export type DatabaseConnection = typeof db;
