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

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFiles.length = 0;
  documentWrite.mockReset();
  mockFetch.mockReset();
});

afterEach(() => {
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
  documentWrite.mockImplementationOnce(() => {
    throw new Error("Synthetic write failure");
  });

  // When
  const download = downloadMatchDocument(id, "information", {});

  // Then
  await expect(download).rejects.toThrow("Synthetic write failure");
  expect(mockFiles[0].exists).toBe(false);
  expect(mockFiles[0].delete).toHaveBeenCalledTimes(1);
});

it("releases a just-written file when cancellation wins before handoff", async () => {
  // Given
  const controller = new AbortController();
  mockFetch.mockResolvedValue(
    new Response("%PDF-1.7\n%%EOF", {
      headers: { "Content-Type": "application/pdf" },
    }),
  );
  documentWrite.mockImplementationOnce(() => controller.abort());

  // When
  const download = downloadMatchDocument(id, "information", {
    signal: controller.signal,
  });

  // Then
  await expect(download).rejects.toThrow();
  expect(mockFiles[0].exists).toBe(false);
});
