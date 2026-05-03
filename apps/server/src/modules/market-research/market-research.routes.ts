import { Router } from "express";
import { requireAuthenticatedSessionMiddleware } from "../../middleware/authentication-session.middleware.js";
import { researchJobCreationRateLimiterMiddleware } from "../../middleware/request-rate-limiter.middleware.js";
import {
  handleStartMarketResearchJobRequest,
  handleGetAllUserResearchJobsRequest,
  handleGetSingleResearchJobStatusRequest,
  handleDeleteResearchJobRequest,
} from "./market-research.controller.js";

export const marketResearchRouter = Router();

marketResearchRouter.use(requireAuthenticatedSessionMiddleware);

marketResearchRouter.post(
  "/",
  researchJobCreationRateLimiterMiddleware,
  handleStartMarketResearchJobRequest,
);

marketResearchRouter.get("/", handleGetAllUserResearchJobsRequest);

marketResearchRouter.get("/:searchId", handleGetSingleResearchJobStatusRequest);

marketResearchRouter.delete("/:searchId", handleDeleteResearchJobRequest);
