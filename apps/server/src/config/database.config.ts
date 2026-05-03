import { serverEnvironment } from "./environment-variables.config.js";

export const databaseConnectionUrl: string = serverEnvironment.DATABASE_URL;
