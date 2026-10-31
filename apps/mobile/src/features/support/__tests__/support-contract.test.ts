import { createSupportRequest } from "../../../../.generated/mobile";
import { ApiError } from "../../../shared/api/api-fetch";
import { supportMetadata, supportImage } from "./fixtures";

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
  if (originalApiUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
});

it.each([
  [400, "invalid-request"],
  [401, "unauthenticated"],
  [403, "forbidden"],
  [413, "payload-too-large"],
  [415, "unsupported-media-type"],
  [422, "unprocessable-content"],
  [503, "unavailable"],
] as const)(
  "preserves the canonical %i refusal without resending",
  async (status, type) => {
    // Given
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          type: `urn:blockout:problem:${type}`,
          title: "Refusal",
          status,
        }),
        {
          status,
          headers: {
            "Content-Type": "application/problem+json",
            "Cache-Control": "no-store",
          },
        },
      ),
    );

    // When
    const result = createSupportRequest({
      metadata: supportMetadata,
      images: [supportImage("png"), supportImage("jpeg")],
    });

    // Then
    await expect(result).rejects.toMatchObject({
      kind: "http",
      status,
      problem: { type: `urn:blockout:problem:${type}` },
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  },
);

it("leaves a lost response unconfirmed without receipt lookup", async () => {
  // Given
  mockFetch.mockRejectedValue(new Error("controlled lost response"));

  // When
  const result = createSupportRequest({ metadata: supportMetadata });

  // Then
  await expect(result).rejects.toBeInstanceOf(ApiError);
  await expect(result).rejects.toMatchObject({ kind: "network" });
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch.mock.calls[0][0]).toBe(
    "https://api.example.invalid/support-requests",
  );
  expect(mockFetch.mock.calls[0][1]?.method).toBe("POST");
});
