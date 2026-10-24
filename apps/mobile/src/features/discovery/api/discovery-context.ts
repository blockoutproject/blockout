import {
  ListClubsParams,
  ListTeamsParams,
  ListPoolsParams,
  type SearchResourceTypeEnum,
} from "../../../../.generated/schemas/index.zod";
import {
  getListClubsQueryKey,
  getListTeamsQueryKey,
  getListPoolsQueryKey,
} from "../../../../.generated/mobile";
import type { ApiFetchOptions } from "../../../shared/api/api-fetch";
import { getSessionQueryKey } from "../../../shared/query/query-client";

/** Public discovery kind; the generated options enum owns the sporting subset. */
export type DiscoveryResource = "club" | SearchResourceTypeEnum;

/**
 * Builds a detached search selection and native Query key without waiting for identity or Pro.
 * Generated schemas validate individual request shapes. Cross-field modes stay at this boundary.
 * Wire text stays unchanged; the key folds Unicode whitespace and case without imposing a second
 * length limit on the normalized result. Other control and format characters remain textual input.
 * Pagination is excluded from the key; examples retain ordered identities. The caller owns bypass
 * authorization and cancels its signal when intent changes; transport rejects old-session completions.
 * Supply fresh F12 request options immediately after credentials in each queryFn or command. This
 * selection helper does not revalidate retained options; they are not a reusable authorization grant.
 */
export function createDiscoveryContext(
  resource: DiscoveryResource,
  input: ListTeamsParams = {},
  bypass?: ApiFetchOptions,
) {
  let schema:
    typeof ListClubsParams | typeof ListTeamsParams | typeof ListPoolsParams =
    ListPoolsParams;
  if (resource === "club") schema = ListClubsParams;
  else if (resource === "team") schema = ListTeamsParams;
  const parsed = schema.strict().parse(input);
  let q = (parsed.q ?? "").replace(/\p{White_Space}+/gu, " ").toLowerCase();
  // Folding leaves at most one ASCII space at either edge; preserve other control characters.
  if (q.startsWith(" ")) q = q.slice(1);
  if (q.endsWith(" ")) q = q.slice(0, -1);
  if (
    (parsed.cursor !== undefined && q === "") ||
    (parsed.exampleIds !== undefined &&
      (q !== "" ||
        parsed.cursor !== undefined ||
        new Set(parsed.exampleIds.map((id) => id.toLowerCase())).size !==
          parsed.exampleIds.length))
  ) {
    throw new Error("Invalid discovery selection");
  }
  const params = Object.freeze({
    ...parsed,
    ...(parsed.exampleIds ? { exampleIds: [...parsed.exampleIds] } : {}),
  });
  if (params.exampleIds) Object.freeze(params.exampleIds);
  const { cursor: _cursor, ...filters } = params;
  const selection = Object.freeze({ ...filters, q });
  let queryKey;
  if (resource === "club") queryKey = getListClubsQueryKey(selection);
  else if (resource === "team") queryKey = getListTeamsQueryKey(selection);
  else queryKey = getListPoolsQueryKey(selection);
  const request = bypass ?? {};
  if (
    bypass &&
    (!request.session ||
      !request.signal ||
      new Headers(request.headers).get("Blockout-Maintenance-Bypass") !==
        "true")
  )
    throw new Error("Discovery bypass requires captured F12 request options");
  return Object.freeze({
    resource,
    params,
    queryKey:
      bypass && request.session
        ? getSessionQueryKey(request.session.generation, [
            "discovery-bypass",
            ...queryKey,
          ])
        : queryKey,
    request: Object.freeze({ ...request }),
  });
}
