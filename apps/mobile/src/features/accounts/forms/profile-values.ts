import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
import type { ProfileValues } from "../schemas/profile-schema";

/** Seeds or accepts the original account without turning its existing photo into a replacement. */
export function profileValues(account: AccountResponse): ProfileValues {
  return { username: account.username, photo: { action: "keep" } };
}
