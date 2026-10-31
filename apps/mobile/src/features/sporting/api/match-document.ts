import { randomUUID } from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import { getMatchDocument } from "../../../../.generated/mobile";
import type { MatchDocumentKindEnum } from "../../../../.generated/schemas/index.zod";
import { ApiError, type ApiFetchOptions } from "../../../shared/api/api-fetch";

/** The reader and match information share the canonical document-kind labels. */
export const matchDocumentLabels: Record<MatchDocumentKindEnum, string> = {
  information: "Fiche d’information",
  scoresheet: "Feuille de match",
  statistics: "Statistiques",
};

/**
 * Uses only F13's generated binary transport. The caller owns cancellation and the returned file.
 * A cancellation winning after Fetch/body completion cannot create or deliver a stale local file.
 * Partial writes are released before the ordinary opening failure reaches the reader.
 */
export async function downloadMatchDocument(
  matchId: string,
  kind: MatchDocumentKindEnum,
  options: ApiFetchOptions,
): Promise<File> {
  const blob = await getMatchDocument(matchId, kind, options);
  options.signal?.throwIfAborted();
  if (blob.type.split(";", 1)[0].toLowerCase() !== "application/pdf")
    throw new ApiError("schema");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  options.signal?.throwIfAborted();
  const directory = new Directory(Paths.cache, "f03-match-documents");
  directory.create({ intermediates: true, idempotent: true });
  const file = new File(directory, `f03-${randomUUID()}.pdf`);
  try {
    file.create();
    file.write(bytes);
    options.signal?.throwIfAborted();
    return file;
  } catch (error) {
    releaseMatchDocument(file);
    throw error;
  }
}

/** Releases an owned handle; a native deletion failure leaves only a cold-start-cleanable file. */
export function releaseMatchDocument(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch {
    // This native boundary owns the failure; never include the local path or PDF content.
    console.warn("Temporary match document cleanup failed");
  }
}

/** Cold-start cleanup touches only this feature's named temporary PDF files, never other cache data. */
export function cleanupMatchDocuments(): void {
  try {
    const directory = new Directory(Paths.cache, "f03-match-documents");
    if (!directory.exists) return;
    for (const entry of directory.list()) {
      if (
        entry instanceof File &&
        /^f03-[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\.pdf$/i.test(
          entry.name,
        )
      )
        releaseMatchDocument(entry);
    }
  } catch {
    console.warn("Temporary match document cleanup failed");
  }
}
