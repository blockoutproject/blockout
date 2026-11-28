import type { Credentials } from "react-native-auth0";

/** Controlled native I/O for the real Auth0 SDK; each suite resets its own scenarios. */
export const mockAuth0 = {
  hasValidAuth0InstanceWithConfiguration: jest.fn().mockResolvedValue(true),
  initializeAuth0WithConfiguration: jest.fn().mockResolvedValue(undefined),
  getBundleIdentifier: jest.fn().mockResolvedValue("com.blockout.test"),
  hasValidCredentials: jest.fn<Promise<boolean>, []>(),
  getCredentials: jest.fn<Promise<Credentials>, []>(),
  clearCredentials: jest.fn<Promise<void>, []>(),
  saveCredentials: jest.fn<Promise<void>, [Credentials]>(),
  webAuth: jest.fn<Promise<Credentials>, unknown[]>(),
  webAuthLogout: jest.fn<Promise<void>, unknown[]>(),
};

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
