import type { Credentials } from "react-native-auth0";

/** Controlled native I/O shared by session tests; each suite resets its own scenarios. */
export const mockClient = {
  credentialsManager: {
    hasValidCredentials: jest.fn<Promise<boolean>, []>(),
    getCredentials: jest.fn<Promise<Credentials>, []>(),
    clearCredentials: jest.fn<Promise<void>, []>(),
    saveCredentials: jest.fn<Promise<void>, [Credentials]>(),
  },
  webAuth: {
    authorize: jest.fn<Promise<Credentials>, []>(),
    clearSession: jest.fn<Promise<void>, []>(),
  },
};

/** Supplies the real SDK React integration and errors to an explicitly installed Jest module mock. */
export function nativeAuth0Module() {
  return {
    __esModule: true,
    ...jest.requireActual("react-native-auth0/src/core/models"),
    default: jest.requireMock(
      require.resolve("react-native-auth0/src/Auth0.ts"),
    ).default,
    useAuth0: jest.requireActual("react-native-auth0/src/hooks/useAuth0.ts")
      .useAuth0,
    Auth0Provider: jest.requireActual(
      "react-native-auth0/src/hooks/Auth0Provider.tsx",
    ).Auth0Provider,
  };
}

/** Synthetic identity for SDK decoding; native signature/storage validation is outside this fixture. */
export function credentialsFor(subject: string): Credentials {
  const payload = Buffer.from(JSON.stringify({ sub: subject })).toString(
    "base64url",
  );
  return {
    accessToken: "test-access-token",
    idToken: `e30.${payload}.test-signature`,
    tokenType: "Bearer",
    expiresAt: 2_000_000_000,
  };
}
