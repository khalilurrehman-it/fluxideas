import "dotenv/config";
import { betterAuthInstance } from "../../config/better-auth.config.js";
import { serverLogger } from "../../config/logger.config.js";

// Run with: tsx src/database/seeds/super-admin-account.seed.ts
async function seedSuperAdminAccount(): Promise<void> {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@idearadar.app";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "Admin@IdeaRadar2025!";
  const adminName = process.env.SEED_ADMIN_NAME ?? "IdeaRadar Admin";

  serverLogger.info("seed", `Creating super admin account: ${adminEmail}`);

  await betterAuthInstance.api.signUpEmail({
    body: {
      email: adminEmail,
      password: adminPassword,
      name: adminName,
    },
  });

  serverLogger.info("seed", "Super admin account created successfully.");
  process.exit(0);
}

seedSuperAdminAccount().catch((error) => {
  serverLogger.error("seed", "Failed to seed super admin account", error);
  process.exit(1);
});
