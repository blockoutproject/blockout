import { createSupportRequest } from "../../../../.generated/mobile";
import {
  CreateSupportRequest201,
  SubmitSupportRequest,
} from "../../../../.generated/schemas/index.zod";
import { supportImage, supportMetadata } from "./fixtures";

const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
jest.mock("expo/fetch", () => ({
  fetch: (url: RequestInfo | URL, options?: RequestInit) =>
    mockFetch(url, options),
}));

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  mockFetch.mockReset();
});
afterEach(() => {
  jest.restoreAllMocks();
  if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
});

it.each(["title", "description"])(
  "rejects Unicode whitespace-only %s at the generated request boundary",
  (field) => {
    // Given
    const metadata = { ...supportMetadata, [field]: "\u2003\u00a0\ufeff" };

    // When
    const result = SubmitSupportRequest.safeParse(metadata);

    // Then
    expect(result.success).toBe(false);
  },
);

it.each([
  ["title", 200],
  ["description", 10_000],
  ["screen", 256],
] as const)(
  "enforces the approved UTF-16 boundary for %s",
  (field, maximum) => {
    // Given
    const text = "🏐".repeat(maximum / 2);
    const exact =
      field === "screen"
        ? { ...supportMetadata, context: { screen: text } }
        : { ...supportMetadata, [field]: text };
    const excessive =
      field === "screen"
        ? { ...supportMetadata, context: { screen: text + "x" } }
        : { ...supportMetadata, [field]: text + "x" };

    // When
    const accepted = SubmitSupportRequest.safeParse(exact);
    const rejected = SubmitSupportRequest.safeParse(excessive);

    // Then
    expect(accepted.success).toBe(true);
    expect(rejected.success).toBe(false);
  },
);

it.each([0, 5])(
  "sends JSON metadata and %i repeated image parts through the generated client",
  async (count) => {
    // Given
    const images = Array.from({ length: count }, (_, index) =>
      supportImage(index % 2 === 0 ? "png" : "jpeg"),
    );
    const requestId = "00000000-0000-4000-8000-000000000001";
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ requestId, future: true }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const parse = jest.spyOn(CreateSupportRequest201, "parse");

    // When
    const result = await createSupportRequest({
      metadata: supportMetadata,
      images,
    });

    // Then
    const [, request] = mockFetch.mock.calls[0];
    expect(request?.body).toBeInstanceOf(FormData);
    const body = request?.body as FormData;
    const metadata = body.get("metadata");
    expect(metadata).toBeInstanceOf(Blob);
    expect((metadata as Blob).type).toBe("application/json");
    expect(JSON.parse(await (metadata as Blob).text())).toEqual(
      supportMetadata,
    );
    expect(body.getAll("images")).toHaveLength(count);
    expect(new Headers(request?.headers).has("Content-Type")).toBe(false);
    expect(parse).toHaveBeenCalledTimes(1);
    expect(result.requestId).toBe(requestId);
  },
);

it.each([{}, { requestId: "invalid" }, { requestId: null }])(
  "rejects a malformed success before resolving",
  async (response) => {
    // Given
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify(response), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );

    // When
    const result = createSupportRequest({ metadata: supportMetadata });

    // Then
    await expect(result).rejects.toMatchObject({ kind: "schema" });
  },
);
