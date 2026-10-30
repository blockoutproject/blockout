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

/** Original account identity captured from F05; profile availability remains with its current query. */
export interface FollowingOwner {
  readonly accountId: string;
  readonly subject: string | null;
}
/** Sporting identity only; screen, name, Pro and display season never define a follow target. */
export interface FollowingTarget {
  readonly type: "team" | "pool";
  readonly id: string;
}
/** Captures the established native account for an original-target request. Credentials enforce principal ownership. */
export function captureFollowingOwner(
  session: SessionSnapshot,
): FollowingOwner | null {
  return session.accountId
    ? { accountId: session.accountId, subject: session.subject }
    : null;
}
/** One confirmed relationship per original account/session/target; admission affects requests, not its identity. */
export function followStateKey(owner: FollowingOwner, target: FollowingTarget) {
  return [
    ...(target.type === "team"
      ? getGetTeamFollowStateQueryKey(owner.accountId, target.id)
      : getGetPoolFollowStateQueryKey(owner.accountId, target.id)),
  ];
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
  return [...generated, owner.accountId, target.id];
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
  return withAdmission(
    type === "team"
      ? getListTeamFollowsQueryKey(owner.accountId, selection)
      : getListPoolFollowsQueryKey(owner.accountId, selection),
    bypass,
  );
}
/** Isolates the personal-space options while preserving ordinary versus bypass admission. */
export function followOptionsKey(owner: FollowingOwner, bypass = false) {
  return withAdmission(getGetFollowOptionsQueryKey(owner.accountId), bypass);
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
  return withAdmission(
    getListPersonalMatchesQueryKey(owner.accountId, selection),
    bypass,
  );
}
/** Captures every personal calendar selection within one original session/account/admission context. */
export function personalCalendarCollectionKey(
  owner: FollowingOwner,
  bypass = false,
) {
  return withAdmission(getListPersonalMatchesQueryKey(owner.accountId), bypass);
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
  return bypass ? withAdmission(generated, true) : Object.freeze(generated);
}
/** Adds the selected request admission without introducing an account cache namespace. */
function withAdmission(generated: QueryKey, bypass: boolean) {
  const selection = generated[1];
  return [
    generated[0],
    {
      ...(typeof selection === "object" && selection !== null ? selection : {}),
      bypass,
    },
  ];
}
