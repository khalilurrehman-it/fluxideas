type LogLevel = "info" | "warn" | "error" | "debug";

function formatServerLogMessage(level: LogLevel, context: string, message: string): string {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}`;
}

export const serverLogger = {
  info: (context: string, message: string) =>
    console.log(formatServerLogMessage("info", context, message)),

  warn: (context: string, message: string) =>
    console.warn(formatServerLogMessage("warn", context, message)),

  error: (context: string, message: string, error?: unknown) => {
    console.error(formatServerLogMessage("error", context, message));
    if (error) console.error(error);
  },

  debug: (context: string, message: string) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(formatServerLogMessage("debug", context, message));
    }
  },
};
