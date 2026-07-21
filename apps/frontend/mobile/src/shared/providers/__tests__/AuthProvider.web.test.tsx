import { act, renderHook } from "@testing-library/react-native";

import { useAuth0 } from "../AuthProvider.web";

const mockGetAccessTokenSilently = jest.fn();
const mockLoginWithRedirect = jest.fn();
const mockLogout = jest.fn();
const mockAuth0State = {
  error: undefined,
  isAuthenticated: true,
  isLoading: false,
  user: { sub: "auth0|local-test-user" },
};

jest.mock("@auth0/auth0-react", () => ({
  Auth0Provider: ({ children }: { children: React.ReactNode }) => children,
  useAuth0: () => ({
    ...mockAuth0State,
    getAccessTokenSilently: mockGetAccessTokenSilently,
    loginWithRedirect: mockLoginWithRedirect,
    logout: mockLogout,
  }),
}));

describe("AuthProvider web adapter", () => {
  beforeAll(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { origin: "http://localhost:8081" },
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth0State.isAuthenticated = true;
    mockGetAccessTokenSilently.mockResolvedValue("local-access-token");
    mockLoginWithRedirect.mockResolvedValue(undefined);
    mockLogout.mockResolvedValue(undefined);
  });

  it("requests the configured authorization parameters", async () => {
    const { result } = await renderHook(() => useAuth0());

    await act(async () => {
      await result.current.authorize({
        audience: "https://api.blockoutproject.com/",
        scope: "openid profile email offline_access",
      });
    });

    expect(mockLoginWithRedirect).toHaveBeenCalledWith({
      authorizationParams: {
        audience: "https://api.blockoutproject.com/",
        scope: "openid profile email offline_access",
      },
    });
  });

  it("returns only the access token expected by the shared session", async () => {
    const { result } = await renderHook(() => useAuth0());

    await expect(result.current.getCredentials()).resolves.toEqual({
      accessToken: "local-access-token",
    });
  });

  it("keeps session actions stable when Auth0 state is unchanged", async () => {
    const { result, rerender } = await renderHook(() => useAuth0());
    const initialActions = {
      authorize: result.current.authorize,
      clearSession: result.current.clearSession,
      clearCredentials: result.current.clearCredentials,
      getCredentials: result.current.getCredentials,
    };

    await rerender(undefined);

    expect(result.current.authorize).toBe(initialActions.authorize);
    expect(result.current.clearSession).toBe(initialActions.clearSession);
    expect(result.current.clearCredentials).toBe(
      initialActions.clearCredentials,
    );
    expect(result.current.getCredentials).toBe(initialActions.getCredentials);
  });

  it("clears local credentials without navigating to Auth0", async () => {
    const { result } = await renderHook(() => useAuth0());

    await act(async () => {
      await result.current.clearCredentials();
    });

    expect(mockLogout).toHaveBeenCalledWith({ openUrl: false });
  });

  it("ends the Auth0 session and returns to the local application", async () => {
    const { result } = await renderHook(() => useAuth0());

    await act(async () => {
      await result.current.clearSession();
    });

    expect(mockLogout).toHaveBeenCalledWith({
      logoutParams: {
        federated: undefined,
        returnTo: window.location.origin,
      },
    });
  });
});
