import {
  DocumentReader,
  documentRead,
  documentReaders,
} from "../test-support/native-document-files";
import {
  documentFiles as mockFiles,
  documentWrite,
} from "../test-support/native-document-files";
import {
  downloadMatchDocument,
  cleanupMatchDocuments,
} from "../api/match-document";
import { File, Directory, Paths } from "expo-file-system";

jest.mock("expo/fetch", () => ({
  fetch: (...args: unknown[]) => mockFetch(...args),
}));
jest.mock(
  "expo-file-system",
  () =>
    jest.requireActual("../test-support/native-document-files")
      .nativeDocumentFiles,
);
const mockFetch = jest.fn();
const id = "00000000-0000-4000-8000-000000000259";

const originalReader = Object.getOwnPropertyDescriptor(
  globalThis,
  "FileReader",
);

beforeEach(() => {
  Object.defineProperty(globalThis, "FileReader", {
    configurable: true,
    value: DocumentReader,
  });
  documentReaders.length = 0;
  documentRead.mockClear();
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFiles.length = 0;
  documentWrite.mockReset().mockResolvedValue(undefined);
  mockFetch.mockReset();
});

afterEach(() => {
  if (originalReader)
    Object.defineProperty(globalThis, "FileReader", originalReader);
  delete process.env.EXPO_PUBLIC_API_URL;
});

it("uses the generated cancellable PDF request and writes its exact binary bytes into an owned local file", async () => {
  // Given
  const bytes = new TextEncoder().encode("%PDF-1.7\nsynthetic\n%%EOF");
  mockFetch.mockResolvedValue(
    new Response(bytes, { headers: { "Content-Type": "application/pdf" } }),
  );
  const controller = new AbortController();

  // When
  const file = await downloadMatchDocument(id, "information", {
    signal: controller.signal,
  });

  // Then
  expect(mockFetch).toHaveBeenCalledWith(
    `https://api.example.invalid/matches/${id}/documents/information`,
    expect.objectContaining({ signal: controller.signal }),
  );
  expect(file.uri).toMatch(
    /^file:\/\/\/cache\/f03-match-documents\/f03-[\da-f-]+\.pdf$/,
  );
  expect(file.write).toHaveBeenCalledWith(bytes);
});

it("keeps the owned document pending until its native write completes", async () => {
  // Given
  const writing = Promise.withResolvers<void>();
  const started = Promise.withResolvers<void>();
  documentWrite.mockImplementationOnce(() => {
    started.resolve();
    return writing.promise;
  });
  mockFetch.mockResolvedValue(
    new Response("%PDF-1.7\n%%EOF", {
      headers: { "Content-Type": "application/pdf" },
    }),
  );
  let delivered = false;

  // When
  const download = downloadMatchDocument(id, "information", {}).then((file) => {
    delivered = true;
    return file;
  });
  await started.promise;
  await Promise.resolve();

  // Then
  expect(delivered).toBe(false);

  // When
  writing.resolve();
  const file = await download;

  // Then
  expect(delivered).toBe(true);
  expect(file.exists).toBe(true);
  expect(file.delete).not.toHaveBeenCalled();
});

it("rejects an obsolete transport completion before creating a file", async () => {
  // Given: native completion may win a Fetch cancellation race.
  const controller = new AbortController();
  mockFetch.mockImplementation(async () => {
    controller.abort();
    return new Response("%PDF-1.7\n%%EOF", {
      headers: { "Content-Type": "application/pdf" },
    });
  });

  // When
  const download = downloadMatchDocument(id, "information", {
    signal: controller.signal,
  });

  // Then
  await expect(download).rejects.toThrow();
  expect(mockFiles).toHaveLength(0);
});

it("cleans only feature-owned leftover PDF files at cold start", () => {
  // Given
  const directory = new Directory(Paths.cache, "f03-match-documents");
  const owned = new File(
    directory,
    "f03-00000000-0000-4000-8000-000000000259.pdf",
  );
  const unrelated = new File(directory, "profile.jpg");
  owned.write(new Uint8Array([1]));
  unrelated.write(new Uint8Array([2]));

  // When
  cleanupMatchDocuments();

  // Then
  expect(owned.delete).toHaveBeenCalledTimes(1);
  expect(unrelated.delete).not.toHaveBeenCalled();
});

it("removes a partial native file before propagating a write failure", async () => {
  // Given
  mockFetch.mockResolvedValue(
    new Response("%PDF-1.7\n%%EOF", {
      headers: { "Content-Type": "application/pdf" },
    }),
  );
  documentWrite.mockRejectedValueOnce(new Error("Synthetic write failure"));

  // When
  const download = downloadMatchDocument(id, "information", {});

  // Then
  await expect(download).rejects.toThrow("Synthetic write failure");
  expect(mockFiles[0].exists).toBe(false);
  expect(mockFiles[0].delete).toHaveBeenCalledTimes(1);
});

it("waits for a cancelled native write to settle before releasing its file", async () => {
  // Given
  const controller = new AbortController();
  const writing = Promise.withResolvers<void>();
  const started = Promise.withResolvers<void>();
  mockFetch.mockResolvedValue(
    new Response("%PDF-1.7\n%%EOF", {
      headers: { "Content-Type": "application/pdf" },
    }),
  );
  documentWrite.mockImplementationOnce(() => {
    started.resolve();
    return writing.promise;
  });

  // When
  const download = downloadMatchDocument(id, "information", {
    signal: controller.signal,
  });
  await started.promise;
  controller.abort();

  // Then
  expect(mockFiles[0].delete).not.toHaveBeenCalled();

  // When
  writing.resolve();

  // Then
  await expect(download).rejects.toThrow();
  expect(mockFiles[0].exists).toBe(false);
  expect(mockFiles[0].delete).toHaveBeenCalledTimes(1);
});

it("reads the installed native Blob shape without requiring Blob.arrayBuffer", async () => {
  // Given: Expo Fetch returns the RN Blob, which does not implement arrayBuffer.
  const blob = new Blob(["%PDF-1.7\nsynthetic\n%%EOF"], {
    type: "application/pdf",
  });
  Object.defineProperty(blob, "arrayBuffer", { value: undefined });
  const response = new Response(null, {
    headers: { "Content-Type": "application/pdf" },
  });
  jest.spyOn(response, "blob").mockResolvedValue(blob);
  mockFetch.mockResolvedValue(response);
  const bytes = new TextEncoder().encode("%PDF-1.7\nsynthetic\n%%EOF");
  documentRead.mockImplementationOnce((reader) => {
    reader.result = bytes.buffer;
    reader.onload?.();
  });

  // When
  const file = await downloadMatchDocument(id, "information", {});

  // Then
  expect(documentRead).toHaveBeenCalledWith(expect.any(DocumentReader), blob);
  expect(file.write).toHaveBeenCalledWith(bytes);
});

it("aborts a pending native Blob read and rejects a late native completion before creating a file", async () => {
  // Given
  const controller = new AbortController();
  const started = Promise.withResolvers<void>();
  mockFetch.mockResolvedValue(
    new Response("%PDF-1.7\n%%EOF", {
      headers: { "Content-Type": "application/pdf" },
    }),
  );
  documentRead.mockImplementationOnce(() => started.resolve());
  const download = downloadMatchDocument(id, "information", {
    signal: controller.signal,
  });
  await started.promise;
  const reader = documentReaders[0];
  const late = reader.onload;

  // When
  controller.abort();
  reader.result = new ArrayBuffer(8);
  late?.();

  // Then
  await expect(download).rejects.toMatchObject({ kind: "cancelled" });
  expect(reader.abort).toHaveBeenCalledTimes(1);
  expect(mockFiles).toHaveLength(0);
});
