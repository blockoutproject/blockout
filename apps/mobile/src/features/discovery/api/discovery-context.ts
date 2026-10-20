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

/** Already captured bypass intent from F12 and session ownership from F05; no entitlement is consulted. */
export interface DiscoveryBypass {
  readonly token: string;
  readonly session: NonNullable<ApiFetchOptions["session"]>;
  readonly signal: AbortSignal;
}

/**
 * Builds a detached search selection and native Query key without waiting for identity or Pro.
 * Generated schemas validate individual request shapes. Cross-field modes stay at this boundary.
 * Wire text stays unchanged; the key folds Unicode whitespace and case without imposing a second
 * length limit on the normalized result. Other control and format characters remain textual input.
 * Pagination is excluded from the key; examples retain ordered identities. The caller owns bypass
 * authorization and cancels its signal when intent changes; transport rejects old-session completions.
 */
export function createDiscoveryContext(
  resource: DiscoveryResource,
  input: ListTeamsParams = {},
  bypass?: DiscoveryBypass,
) {
  const schema =
    resource === "club"
      ? ListClubsParams
      : resource === "team"
        ? ListTeamsParams
        : ListPoolsParams;
  const parsed = schema.strict().parse(input);
  const q = (parsed.q ?? "")
    .replace(/\p{White_Space}+/gu, " ")
    .replace(/^ +| +$/g, "")
    .toLowerCase();
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
  const queryKey =
    resource === "club"
      ? getListClubsQueryKey(selection)
      : resource === "team"
        ? getListTeamsQueryKey(selection)
        : getListPoolsQueryKey(selection);
  const request: ApiFetchOptions = bypass
    ? {
        headers: {
          Authorization: `Bearer ${bypass.token}`,
          "Blockout-Maintenance-Bypass": "true",
        },
        session: bypass.session,
        signal: bypass.signal,
      }
    : {};
  return Object.freeze({
    resource,
    params,
    queryKey: bypass
      ? getSessionQueryKey(bypass.session.generation, [
          "discovery-bypass",
          ...queryKey,
        ])
      : queryKey,
    request: Object.freeze(request),
  });
}
