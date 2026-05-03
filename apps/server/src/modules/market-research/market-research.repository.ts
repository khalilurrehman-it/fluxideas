import { eq, desc } from "drizzle-orm";
import { db } from "../../database/database-connection.js";
import { searchesTable, type SearchRecord, type NewSearchRecord } from "../../database/schema/searches.schema.js";

export async function createNewSearchRecord(
  newSearchData: NewSearchRecord,
): Promise<SearchRecord> {
  const [createdSearch] = await db
    .insert(searchesTable)
    .values(newSearchData)
    .returning();
  return createdSearch!;
}

export async function findSearchRecordById(searchId: string): Promise<SearchRecord | undefined> {
  return db.query.searchesTable.findFirst({
    where: eq(searchesTable.id, searchId),
  });
}

export async function findAllSearchRecordsByUserId(userId: string): Promise<SearchRecord[]> {
  return db.query.searchesTable.findMany({
    where: eq(searchesTable.userId, userId),
    orderBy: [desc(searchesTable.createdAt)],
  });
}

export async function updateSearchRecordPipelineStatus(
  searchId: string,
  newPipelineStatus: SearchRecord["pipelineStatus"],
): Promise<void> {
  await db
    .update(searchesTable)
    .set({ pipelineStatus: newPipelineStatus, updatedAt: new Date() })
    .where(eq(searchesTable.id, searchId));
}

export async function deleteSearchRecordById(searchId: string): Promise<void> {
  await db.delete(searchesTable).where(eq(searchesTable.id, searchId));
}
