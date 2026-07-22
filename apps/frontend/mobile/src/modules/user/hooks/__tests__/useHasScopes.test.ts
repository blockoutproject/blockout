import { renderHook, waitFor } from "@testing-library/react-native";

import useHasScopes from "../useHasScopes";

const mockGetCredentials = jest.fn();
const mockUser = { sub: "auth0|local-test-user" };

jest.mock("@/src/modules/session/auth/AuthProvider", () => ({
  useAuth0: () => ({
    getCredentials: mockGetCredentials,
    user: mockUser,
  }),
}));

const createAccessToken = (permissions: string[]) => {
  const payload = Buffer.from(JSON.stringify({ permissions })).toString(
    "base64url",
  );
  return `header.${payload}.signature`;
};

describe("useHasScopes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reads permissions through the platform Auth0 adapter", async () => {
    mockGetCredentials.mockResolvedValue({
      accessToken: createAccessToken(["read:scrapers", "update:scrapers"]),
    });

    const { result } = await renderHook(() =>
      useHasScopes(["read:scrapers", "update:scrapers"]),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.allowed).toBe(true);
  });

  it("rejects a permission set that does not satisfy the requirement", async () => {
    mockGetCredentials.mockResolvedValue({
      accessToken: createAccessToken(["read:scrapers"]),
    });

    const { result } = await renderHook(() =>
      useHasScopes(["read:scrapers", "update:scrapers"]),
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.allowed).toBe(false);
  });
});
