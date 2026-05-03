import { Router } from "express";
import { requireAuthenticatedSessionMiddleware } from "../../middleware/authentication-session.middleware.js";
import {
  handleGetAllReportsRequest,
  handleGetSingleReportRequest,
  handleDeleteReportRequest,
} from "./report-generation.controller.js";

export const reportGenerationRouter = Router();

reportGenerationRouter.use(requireAuthenticatedSessionMiddleware);

reportGenerationRouter.get("/", handleGetAllReportsRequest);
reportGenerationRouter.get("/:reportId", handleGetSingleReportRequest);
reportGenerationRouter.delete("/:reportId", handleDeleteReportRequest);
