import {
  findAllReportRecordsByUserId,
  findReportRecordById,
  deleteReportRecordById,
  type ReportWithTopic,
} from "./report-generation.repository.js";
import type { ReportRecord } from "../../database/schema/reports.schema.js";

export async function getAllReportsForUser(userId: string): Promise<ReportWithTopic[]> {
  return findAllReportRecordsByUserId(userId);
}

export async function getSingleReportById(
  reportId: string,
  userId: string,
): Promise<ReportRecord | null> {
  const report = await findReportRecordById(reportId);
  if (!report || report.userId !== userId) return null;
  return report;
}

export async function deleteReportById(reportId: string, userId: string): Promise<boolean> {
  const report = await findReportRecordById(reportId);
  if (!report || report.userId !== userId) return false;
  await deleteReportRecordById(reportId);
  return true;
}
