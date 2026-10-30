import type { AccountSession } from "../../accounts";
import { accountResponse } from "../../accounts/test-support/account-response";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";

const transport = jest.requireMock("expo/fetch") as typeof import("expo/fetch");

/** Establishes a synthetic account through the actual Auth0 action and generated account HTTP read. */
export async function signInAccount(
  session: AccountSession,
  accountId: string,
) {
  serveAccount(accountId);
  const credentials = credentialsFor(`auth0|${accountId}`);
  mockAuth0.webAuth.mockResolvedValue(credentials);
  mockAuth0.getCredentials.mockResolvedValue(credentials);
  mockAuth0.saveCredentials.mockResolvedValue();
  await session.signIn("https://api.example.invalid");
}

/** Serves only the original account HTTP resource while preserving the fixture’s other transport handlers. */
export function serveAccount(accountId: string) {
  process.env.EXPO_PUBLIC_API_URL = "https://api.example.invalid";
  const previous = jest.isMockFunction(transport.fetch)
    ? jest.mocked(transport.fetch).getMockImplementation()
    : transport.fetch;
  const fetch = jest.spyOn(transport, "fetch");
  fetch.mockImplementation(async (url, options) => {
    if (String(url).endsWith("/accounts/me"))
      return Response.json(
        accountResponse({
          accountId,
          principalCreatedAt: "2020-01-01T00:00:00Z",
        }),
      ) as Awaited<ReturnType<typeof transport.fetch>>;
    return previous
      ? previous(url, options)
      : (new Response(null, { status: 404 }) as Awaited<
          ReturnType<typeof transport.fetch>
        >);
  });
}
