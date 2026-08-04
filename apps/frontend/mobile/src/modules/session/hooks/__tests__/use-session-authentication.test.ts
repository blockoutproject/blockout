import { act, renderHook, waitFor } from "@testing-library/react-native";

import { useSessionAuthentication } from "@/src/modules/session/hooks/use-session-authentication";

const mockAuthorize = jest.fn();
const mockClearSession = jest.fn();
const mockClearCredentials = jest.fn();
const mockGetCredentials = jest.fn();
const mockRefreshUser = jest.fn();
const mockResetQueryCache = jest.fn();
const mockSetAuthOnApis = jest.fn();
const mockSetGuest = jest.fn();
const mockLeaveGuest = jest.fn();
const mockRouterPush = jest.fn();
const mockApis = { mobile: {} };

let mockAuth0 = {
  authorize: mockAuthorize,
  clearSession: mockClearSession,
  clearCredentials: mockClearCredentials,
  getCredentials: mockGetCredentials,
  user: { sub: "auth0|7" },
  error: null,
  isLoading: false,
};
let mockEnsureUser = {
  data: { id: 7, pseudo: "Blockout" },
  isLoading: false,
  error: null,
  refetch: mockRefreshUser,
};
let mockGuestState = false;

const mockGuestStoreState = {
  get isGuest() {
    return mockGuestState;
  },
  continueAsGuest: mockSetGuest,
  leaveGuest: mockLeaveGuest,
};

jest.mock("@/src/modules/session/auth/auth-provider", () => ({
  useAuth0: () => mockAuth0,
}));

jest.mock("@/src/modules/user/hooks/use-ensure-user", () => ({
  useEnsureUser: () => mockEnsureUser,
}));

jest.mock("@/src/shared/providers/api-provider", () => ({
  useApis: () => mockApis,
}));

jest.mock("@/src/shared/providers/query-provider", () => ({
  useResetQueryCache: () => mockResetQueryCache,
}));

jest.mock("@/src/shared/api", () => ({
  setAuthOnApis: (...args: unknown[]) => mockSetAuthOnApis(...args),
}));

jest.mock("@/src/modules/session/model/guest-session-store", () => ({
  useGuestSessionStore: Object.assign(
    (selector: (state: typeof mockGuestStoreState) => unknown) =>
      selector(mockGuestStoreState),
    { getState: () => mockGuestStoreState },
  ),
}));

jest.mock("expo-router", () => ({
  router: { push: (...args: unknown[]) => mockRouterPush(...args) },
  usePathname: () => "/profile",
}));

describe("session authentication", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGuestState = false;
    mockAuth0 = {
      authorize: mockAuthorize,
      clearSession: mockClearSession,
      clearCredentials: mockClearCredentials,
      getCredentials: mockGetCredentials,
      user: { sub: "auth0|7" },
      error: null,
      isLoading: false,
    };
    mockEnsureUser = {
      data: { id: 7, pseudo: "Blockout" },
      isLoading: false,
      error: null,
      refetch: mockRefreshUser,
    };
    mockGetCredentials.mockResolvedValue({ accessToken: "token" });
    mockAuthorize.mockResolvedValue(undefined);
    mockClearSession.mockResolvedValue(undefined);
    mockClearCredentials.mockResolvedValue(undefined);
    mockRefreshUser.mockResolvedValue(undefined);
    mockResetQueryCache.mockResolvedValue(undefined);
  });

  it("bootstraps authenticated APIs and handles unauthorized recovery", async () => {
    const onAuthenticatedSessionEnded = jest.fn();
    const { result } = await renderHook(() =>
      useSessionAuthentication({ onAuthenticatedSessionEnded }),
    );
    const actions = result.current.actions;

    await waitFor(() => {
      expect(result.current.state.isBootstrapped).toBe(true);
      expect(mockRefreshUser).toHaveBeenCalledTimes(1);
      expect(mockSetAuthOnApis).toHaveBeenCalledTimes(1);
    });
    expect(result.current.actions).toBe(actions);

    const [, tokenSupplier, onUnauthorized] =
      mockSetAuthOnApis.mock.calls[0] ?? [];
    await expect(tokenSupplier()).resolves.toBe("token");

    await act(async () => {
      await onUnauthorized(new Error("unauthorized"));
    });

    expect(mockClearCredentials).toHaveBeenCalledTimes(1);
    expect(mockResetQueryCache).toHaveBeenCalledTimes(1);
  });

  it("completes anonymous bootstrap without mirroring remote user state", async () => {
    mockGetCredentials.mockResolvedValue(null);
    mockEnsureUser = {
      ...mockEnsureUser,
      data: undefined as never,
    };

    const { result } = await renderHook(() =>
      useSessionAuthentication({
        onAuthenticatedSessionEnded: jest.fn(),
      }),
    );

    await waitFor(() => expect(result.current.state.isBootstrapped).toBe(true));
    expect(mockSetAuthOnApis).toHaveBeenCalledWith(
      mockApis,
      undefined,
      undefined,
    );
    expect(mockRefreshUser).not.toHaveBeenCalled();
    expect(result.current.state.isAuthenticated).toBe(false);
  });

  it("preserves sign-in, guest, local sign-out, cache, and redirect transitions", async () => {
    mockAuth0 = { ...mockAuth0, isLoading: true };
    const onAuthenticatedSessionEnded = jest.fn();
    const { result } = await renderHook(() =>
      useSessionAuthentication({ onAuthenticatedSessionEnded }),
    );

    await act(async () => {
      result.current.actions.continueAsGuest();
    });
    expect(mockSetGuest).toHaveBeenCalledTimes(1);
    expect(mockSetAuthOnApis).toHaveBeenCalledWith(
      mockApis,
      undefined,
      undefined,
    );

    mockGuestState = true;
    await act(async () => {
      await result.current.actions.signOutLocal();
    });
    expect(mockLeaveGuest).toHaveBeenCalledTimes(1);
    expect(mockResetQueryCache).toHaveBeenCalledTimes(1);
    expect(onAuthenticatedSessionEnded).not.toHaveBeenCalled();

    mockGuestState = false;
    await act(async () => {
      await result.current.actions.signOutLocal();
    });
    expect(mockClearCredentials).toHaveBeenCalledTimes(1);
    expect(mockResetQueryCache).toHaveBeenCalledTimes(2);
    expect(onAuthenticatedSessionEnded).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.actions.signIn();
    });
    expect(mockAuthorize).toHaveBeenCalledTimes(1);
    expect(mockRefreshUser).toHaveBeenCalledTimes(1);
    expect(mockLeaveGuest).toHaveBeenCalledTimes(2);
    expect(mockRouterPush).toHaveBeenCalledWith("/(tabs)/(feed)");
  });

  it("completes local logout after successful Auth0 SSO logout", async () => {
    mockAuth0 = { ...mockAuth0, isLoading: true };
    const onAuthenticatedSessionEnded = jest.fn();
    const { result } = await renderHook(() =>
      useSessionAuthentication({ onAuthenticatedSessionEnded }),
    );

    await act(async () => {
      await result.current.actions.signOutSSO({ federated: true });
    });

    expect(mockClearSession).toHaveBeenCalledWith(
      { federated: true },
      expect.any(Object),
    );
    expect(mockClearCredentials).toHaveBeenCalledTimes(1);
    expect(mockSetAuthOnApis).toHaveBeenCalledWith(
      mockApis,
      undefined,
      undefined,
    );
    expect(mockResetQueryCache).toHaveBeenCalledTimes(1);
    expect(onAuthenticatedSessionEnded).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["cancelled", new Error("a0.session.user_cancelled")],
    ["network-failed", new Error("Network request failed")],
  ])(
    "completes local logout when Auth0 SSO logout is %s",
    async (_outcome, error) => {
      mockAuth0 = { ...mockAuth0, isLoading: true };
      mockClearSession.mockRejectedValueOnce(error);
      const onAuthenticatedSessionEnded = jest.fn();
      const { result } = await renderHook(() =>
        useSessionAuthentication({ onAuthenticatedSessionEnded }),
      );

      await act(async () => {
        await result.current.actions.signOutSSO();
      });

      expect(mockClearCredentials).toHaveBeenCalledTimes(1);
      expect(mockSetAuthOnApis).toHaveBeenCalledWith(
        mockApis,
        undefined,
        undefined,
      );
      expect(mockResetQueryCache).toHaveBeenCalledTimes(1);
      expect(onAuthenticatedSessionEnded).toHaveBeenCalledTimes(1);
    },
  );

  it("finishes the remaining local logout steps when credential cleanup fails", async () => {
    mockAuth0 = { ...mockAuth0, isLoading: true };
    mockClearCredentials.mockRejectedValueOnce(new Error("cleanup failed"));
    const onAuthenticatedSessionEnded = jest.fn();
    const { result } = await renderHook(() =>
      useSessionAuthentication({ onAuthenticatedSessionEnded }),
    );

    await act(async () => {
      await result.current.actions.signOutSSO();
    });

    expect(mockSetAuthOnApis).toHaveBeenCalledWith(
      mockApis,
      undefined,
      undefined,
    );
    expect(mockResetQueryCache).toHaveBeenCalledTimes(1);
    expect(onAuthenticatedSessionEnded).toHaveBeenCalledTimes(1);
  });

  it("keeps guest SSO logout behavior unchanged", async () => {
    mockAuth0 = { ...mockAuth0, isLoading: true };
    mockGuestState = true;
    const onAuthenticatedSessionEnded = jest.fn();
    const { result } = await renderHook(() =>
      useSessionAuthentication({ onAuthenticatedSessionEnded }),
    );

    await act(async () => {
      await result.current.actions.signOutSSO();
    });

    expect(mockLeaveGuest).toHaveBeenCalledTimes(1);
    expect(mockResetQueryCache).toHaveBeenCalledTimes(1);
    expect(mockClearSession).not.toHaveBeenCalled();
    expect(mockClearCredentials).not.toHaveBeenCalled();
    expect(onAuthenticatedSessionEnded).not.toHaveBeenCalled();
  });
});
