import { serverEnvironment } from "./environment-variables.config.js";

export const corsAllowedOrigins: string[] = [serverEnvironment.FRONTEND_URL];
