import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSupportRequest } from "../../../../.generated/mobile";
import {
  CreateSupportRequest201,
  SubmitSupportRequest,
} from "../../../../.generated/schemas/index.zod";
import { apiFetch } from "../../../shared/api/api-fetch";

// Jest Expo supplies native doubles. This suite replaces only the native HTTP boundary with
// Node's ordinary Fetch/FormData implementation; every response comes from the Java provider.
jest.mock("expo/fetch", () => ({
  fetch: async (url: RequestInfo | URL, options?: RequestInit) => {
    const response = await mockNativeHttp.fetch(url, {
      ...options,
      signal: options?.signal ?? mockNativeHttp.AbortSignal.timeout(15_000),
    });
    mockResponses.push({ status: response.status, headers: response.headers });
    return response;
  },
}));

const mockNativeHttp: Pick<
  typeof globalThis,
  "fetch" | "FormData" | "Blob" | "AbortSignal"
> = jest
  .requireActual("node:vm")
  .runInThisContext("({ fetch, FormData, Blob, AbortSignal })");
let mockResponses: { status: number; headers: Headers }[] = [];
const previousApi = process.env.EXPO_PUBLIC_API_URL;
const previousGlobals = { FormData, Blob };
const provider = process.env.BLOCKOUT_SUPPORT_PROVIDER_URL;
const suite = provider ? describe : describe.skip;

/** Reads shared fictional originals; the Java owner checks the complete delivered snapshot. */
function fixture(name: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(
    readFileSync(resolve("../backend/src/test/resources/support", name)),
  );
}

suite("generated support multipart consumer over actual loopback HTTP", () => {
  beforeAll(() => {
    Object.assign(globalThis, {
      FormData: mockNativeHttp.FormData,
      Blob: mockNativeHttp.Blob,
    });
  });

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = provider;
    mockResponses = [];
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (previousApi === undefined) {
      delete process.env.EXPO_PUBLIC_API_URL;
    } else {
      process.env.EXPO_PUBLIC_API_URL = previousApi;
    }
  });

  afterAll(() => {
    Object.assign(globalThis, previousGlobals);
  });

  it("delivers complete metadata and five distinct originals before confirming receipt", async () => {
    // Given: both consumers use the same complete metadata and image originals.
    const metadata = SubmitSupportRequest.parse(
      JSON.parse(new TextDecoder().decode(fixture("complete-metadata.json"))),
    );
    const images = Array.from({ length: 5 }, (_, index) => {
      const format = index % 2 === 0 ? "png" : "jpg";
      return new Blob([fixture(`synthetic.${format}`), Uint8Array.of(index)], {
        type: format === "png" ? "image/png" : "image/jpeg",
      });
    });

    // When
    const validation = jest.spyOn(CreateSupportRequest201, "parse");
    const result = await createSupportRequest({ metadata, images });

    // Then
    expect(result.requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(Object.keys(result)).toEqual(["requestId"]);
    expect(mockResponses).toHaveLength(1);
    expect(validation).toHaveBeenCalledTimes(1);
    expect(mockResponses[0].status).toBe(201);
    expect(mockResponses[0].headers.get("Cache-Control")).toBe("no-store");
    expect(mockResponses[0].headers.has("Location")).toBe(false);
  });

  it("retains the canonical missing-metadata refusal from the real server", async () => {
    // Given
    const body = new FormData();

    // When
    const result = apiFetch("/support-requests", { method: "POST", body });

    // Then
    await expect(result).rejects.toMatchObject({
      kind: "http",
      status: 400,
      problem: { type: "urn:blockout:problem:invalid-request", status: 400 },
    });
    expect(mockResponses).toHaveLength(1);
    expect(mockResponses[0].headers.get("Cache-Control")).toBe("no-store");
    expect(mockResponses[0].headers.get("Content-Type")).toContain(
      "application/problem+json",
    );
  });

  it.each([
    { name: "file overflow", status: 413, type: "payload-too-large" },
    { name: "disguised GIF", status: 415, type: "unsupported-media-type" },
    { name: "corrupt PNG", status: 422, type: "unprocessable-content" },
    { name: "invalid token", status: 401, type: "unauthenticated" },
    { name: "denied bypass", status: 403, type: "forbidden" },
    { name: "provider refusal", status: 503, type: "unavailable" },
  ])("retains the canonical $name refusal", async ({ name, status, type }) => {
    // Given
    const metadata = SubmitSupportRequest.parse(
      JSON.parse(new TextDecoder().decode(fixture("complete-metadata.json"))),
    );
    const headers: Record<string, string> = {};
    const images: Blob[] = [];
    switch (name) {
      case "file overflow":
        images.push(
          new Blob([new Uint8Array(5_242_881)], { type: "image/png" }),
        );
        break;
      case "disguised GIF":
        images.push(
          new Blob([fixture("synthetic.gif")], { type: "image/png" }),
        );
        break;
      case "corrupt PNG":
        images.push(new Blob([fixture("corrupt.png")], { type: "image/png" }));
        break;
      case "invalid token":
        headers.Authorization = "Bearer synthetic-invalid";
        break;
      case "denied bypass":
        headers.Authorization = `Bearer ${process.env.BLOCKOUT_SUPPORT_DENIED_TOKEN ?? ""}`;
        headers["Blockout-Maintenance-Bypass"] = "true";
        break;
      case "provider refusal":
        metadata.title = "Synthetic provider refusal";
        break;
    }

    // When
    const result = createSupportRequest({ metadata, images }, { headers });

    // Then
    await expect(result).rejects.toMatchObject({
      kind: "http",
      status,
      problem: { type: `urn:blockout:problem:${type}`, status },
    });
    expect(mockResponses).toHaveLength(1);
    expect(mockResponses[0].headers.get("Cache-Control")).toBe("no-store");
    expect(mockResponses[0].headers.get("Content-Type")).toContain(
      "application/problem+json",
    );
    expect(mockResponses[0].headers.has("Location")).toBe(false);
    if (status === 401) {
      expect(mockResponses[0].headers.get("WWW-Authenticate")).toContain(
        "Bearer",
      );
    }
  });
});
