import "dotenv/config";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./database-connection.js";
import { serverLogger } from "../config/logger.config.js";

async function runDatabaseMigrations(): Promise<void> {
  serverLogger.info("migrate", "Running database migrations...");

  await migrate(db, { migrationsFolder: "./drizzle/migrations" });

  serverLogger.info("migrate", "All migrations applied successfully.");
  process.exit(0);
}

runDatabaseMigrations().catch((migrationError) => {
  serverLogger.error("migrate", "Migration failed", migrationError);
  process.exit(1);
});
