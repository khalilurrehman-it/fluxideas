export const API_ERROR_MESSAGES = {
  UNAUTHORIZED: "Authentication required. Please sign in.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION_FAILED: "Request validation failed. Check the provided data.",
  INTERNAL_SERVER_ERROR: "An unexpected error occurred. Please try again.",
  RATE_LIMIT_EXCEEDED: "Too many requests. Please wait before trying again.",
  RESEARCH_TOPIC_REQUIRED: "Research topic is required.",
  SEARCH_NOT_FOUND: "Research job not found.",
  REPORT_NOT_FOUND: "Report not found.",
} as const;
