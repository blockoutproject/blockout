import { establishAccount } from "../../../../.generated/mobile";
import { AccountResponse } from "../../../../.generated/schemas/index.zod";
import type { ApiFetchOptions } from "@/shared/api/api-fetch";
import type { AccountCommandSession } from "../session/account-session-provider";

/** Explicit establishment uses the captured native principal, including across its private-tree remount. */
export async function establishAccountForSession(
  session: AccountCommandSession,
  request: (options: ApiFetchOptions) => ApiFetchOptions,
) {
  const credentials = await session.getCredentials();
  return establishAccount(
    request({
      schema: AccountResponse,
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    }),
  );
}
