import { z } from "zod";

const serverEnvironmentVariablesSchema = z.object({
  PORT: z.string().default("8080"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1),
  FRONTEND_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().min(1),
  AGENT_SERVICE_URL: z.string().min(1),
  INTERNAL_API_KEY: z.string().min(1),
});

export type ServerEnvironmentVariables = z.infer<typeof serverEnvironmentVariablesSchema>;

function loadAndValidateServerEnvironmentVariables(): ServerEnvironmentVariables {
  const parseResult = serverEnvironmentVariablesSchema.safeParse(process.env);

  if (!parseResult.success) {
    console.error("[server] Missing or invalid environment variables:");
    parseResult.error.issues.forEach((issue) => {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    });
    process.exit(1);
  }

  return parseResult.data;
}

export const serverEnvironment = loadAndValidateServerEnvironmentVariables();
