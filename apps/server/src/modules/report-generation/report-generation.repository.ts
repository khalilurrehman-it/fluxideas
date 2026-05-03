import { eq, desc } from "drizzle-orm";
import { db } from "../../database/database-connection.js";
import { reportsTable, type ReportRecord, type NewReportRecord } from "../../database/schema/reports.schema.js";
import { searchesTable } from "../../database/schema/searches.schema.js";

export type ReportWithTopic = ReportRecord & { topicQuery: string };


export async function createNewReportRecord(
  newReportData: Omit<NewReportRecord, "id" | "createdAt">,
): Promise<ReportRecord> {
  const [createdReport] = await db
    .insert(reportsTable)
    .values(newReportData)
    .returning();
  return createdReport!;
}

export async function findReportRecordBySearchId(
  searchId: string,
): Promise<ReportRecord | undefined> {
  return db.query.reportsTable.findFirst({
    where: eq(reportsTable.searchId, searchId),
  });
}

export async function findAllReportRecordsByUserId(userId: string): Promise<ReportWithTopic[]> {
  const rows = await db
    .select({
      id: reportsTable.id,
      searchId: reportsTable.searchId,
      userId: reportsTable.userId,
      pdfDownloadUrl: reportsTable.pdfDownloadUrl,
      topValidatedProblems: reportsTable.topValidatedProblems,
      createdAt: reportsTable.createdAt,
      topicQuery: searchesTable.topicQuery,
    })
    .from(reportsTable)
    .innerJoin(searchesTable, eq(reportsTable.searchId, searchesTable.id))
    .where(eq(reportsTable.userId, userId))
    .orderBy(desc(reportsTable.createdAt));
  return rows;
}

export async function findReportRecordById(reportId: string): Promise<ReportRecord | undefined> {
  return db.query.reportsTable.findFirst({
    where: eq(reportsTable.id, reportId),
  });
}

export async function deleteReportRecordById(reportId: string): Promise<void> {
  await db.delete(reportsTable).where(eq(reportsTable.id, reportId));
}
