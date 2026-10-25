import type { QueryKey } from "@tanstack/react-query";
import {
  getGetTeamFollowStateQueryKey,
  getGetPoolFollowStateQueryKey,
  getReplaceTeamFollowStateMutationKey,
  getReplacePoolFollowStateMutationKey,
  getListTeamFollowsQueryKey,
  getListPoolFollowsQueryKey,
  getGetFollowOptionsQueryKey,
  getListPersonalMatchesQueryKey,
  getGetTeamFollowerCountQueryKey,
  getGetPoolFollowerCountQueryKey,
} from "../../../../.generated/mobile";
import {
  ListTeamFollowsParams,
  ListPersonalMatchesParams,
} from "../../../../.generated/schemas/index.zod";
import type { SessionSnapshot } from "../../accounts";
import type { ApiFetchOptions } from "../../../shared/api/api-fetch";
import { getSessionQueryKey } from "../../../shared/query/query-client";

/** Original account identity captured from F05; profile availability remains with its current query. */
export interface FollowingOwner {
  readonly accountId: string;
  readonly generation: string;
  readonly isCurrent: (generation: string) => boolean;
}

/** Sporting identity only; screen, name, Pro and display season never define a follow target. */
export interface FollowingTarget {
  readonly type: "team" | "pool";
  readonly id: string;
}

/**
 * Captures F05's established identity before asynchronous work. Guests or unavailable profiles
 * without an established UUID yield no private context. A read failure does not retire an
 * established UUID; F05 remains responsible for lifecycle invalidation. Pass this same value to
 * the generated call's `session` option so transport also rejects late mutation completions.
 * This identity capture grants no personal action: callers also require F05's currently usable
 * profile and F12 admission; a temporary profile error must suspend new actions without erasure.
 */
export function captureFollowingOwner(
  session: SessionSnapshot & NonNullable<ApiFetchOptions["session"]>,
): FollowingOwner | null {
  return session.accountId && session.isCurrent(session.generation)
    ? Object.freeze({
        accountId: session.accountId,
        generation: session.generation,
        isCurrent: session.isCurrent,
      })
    : null;
}

/** One confirmed relationship per original account/session/target; admission affects requests, not its identity. */
export function followStateKey(owner: FollowingOwner, target: FollowingTarget) {
  return getSessionQueryKey(owner.generation, [
    owner.accountId,
    ...(target.type === "team"
      ? getGetTeamFollowStateQueryKey(owner.accountId, target.id)
      : getGetPoolFollowStateQueryKey(owner.accountId, target.id)),
  ]);
}

/** One mutation identity per session/account/type/target across all originating controls. */
export function followMutationKey(
  owner: FollowingOwner,
  target: FollowingTarget,
) {
  const generated =
    target.type === "team"
      ? getReplaceTeamFollowStateMutationKey()
      : getReplacePoolFollowStateMutationKey();
  return privateKey(owner, [...generated, target.id], false);
}

/**
 * Keys an infinite list selection; page belongs to pageParam, not to the selection identity.
 * The generated schema rejects malformed/unknown filters and the detached object cannot drift.
 */
export function followListKey(
  owner: FollowingOwner,
  type: FollowingTarget["type"],
  input: Omit<ListTeamFollowsParams, "page"> = {},
  bypass = false,
) {
  const selection = Object.freeze(
    ListTeamFollowsParams.omit({ page: true }).strict().parse(input),
  );
  return privateKey(
    owner,
    type === "team"
      ? getListTeamFollowsQueryKey(owner.accountId, selection)
      : getListPoolFollowsQueryKey(owner.accountId, selection),
    bypass,
  );
}

/** Isolates the personal-space options while preserving ordinary versus bypass admission. */
export function followOptionsKey(owner: FollowingOwner, bypass = false) {
  return privateKey(
    owner,
    getGetFollowOptionsQueryKey(owner.accountId),
    bypass,
  );
}

/** Calendar continuation belongs to pageParam; season, category and time zone identify the data. */
export function personalCalendarKey(
  owner: FollowingOwner,
  input: Omit<ListPersonalMatchesParams, "nextDay">,
  bypass = false,
) {
  const selection = Object.freeze(
    ListPersonalMatchesParams.omit({ nextDay: true }).strict().parse(input),
  );
  return privateKey(
    owner,
    getListPersonalMatchesQueryKey(owner.accountId, selection),
    bypass,
  );
}

/** Public counts share their generated key; explicit F12 bypass adds the captured personal scope. */
export function followerCountKey(
  target: FollowingTarget,
  bypass?: FollowingOwner,
) {
  const generated =
    target.type === "team"
      ? getGetTeamFollowerCountQueryKey(target.id)
      : getGetPoolFollowerCountQueryKey(target.id);
  return bypass
    ? privateKey(bypass, generated, true)
    : Object.freeze(generated);
}

/** Uses F13's existing cleanup namespace; credentials and callbacks never enter serializable keys. */
function privateKey(
  owner: FollowingOwner,
  generated: QueryKey,
  bypass: boolean,
) {
  return Object.freeze(
    getSessionQueryKey(owner.generation, [
      owner.accountId,
      bypass,
      ...generated,
    ]),
  );
}
