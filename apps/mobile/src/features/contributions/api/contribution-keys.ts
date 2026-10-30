import {
  getCreateModeratedStreamContributionMutationKey,
  getCreateStreamContributionMutationKey,
  getCreateStreamReactivationMutationKey,
  getCreateStreamReportMutationKey,
  getGetModeratedStreamContributionQueryKey,
  getGetOwnStreamContributionQueryKey,
  getGetOwnStreamReportQueryKey,
  getListModeratedStreamContributionsQueryKey,
  getListOwnStreamContributionsQueryKey,
  getListStreamModerationQueryKey,
  getListStreamReportsQueryKey,
  getUpdateModeratedStreamContributionMutationKey,
  getUpdateOwnStreamContributionMutationKey,
} from "../../../../.generated/mobile";
import type {
  ListModeratedStreamContributionsParams,
  ListStreamModerationParams,
} from "../../../../.generated/schemas/index.zod";
import type { SessionSnapshot } from "../../accounts/session/session-generation";
import { getSessionQueryKey } from "../../../shared/query/query-client";

/** Captured usable F05 identity; callers pass the same session to the generated transport. */
type ContributionActor = SessionSnapshot & { readonly accountId: string };

/** Page belongs to TanStack's infinite-query pageParam, rather than to the traversal identity. */
type ModerationFilters = Omit<ListStreamModerationParams, "page">;

/** Exact version selection retained for every page in one match traversal. */
type VersionFilters = Omit<ListModeratedStreamContributionsParams, "page">;

/** One match command family serializes owner intentions across forms, history and route removal. */
function ownCommands(actor: ContributionActor, matchId: string) {
  return getSessionQueryKey(actor.generation, [
    ...getListOwnStreamContributionsQueryKey(actor.accountId, matchId),
    "commands",
  ]);
}

/**
 * Scopes generated resource/operation keys to F05's captured account and generation.
 * Public F03 data retains its own keys. Keys confer no permission or callback validity;
 * F13 transport and F05's existing cleanup guard obsolete work independently.
 */
export const contributionKeys = {
  /** Shared owner-command exclusion and required-read scope for one original match. */
  ownCommands,
  /** Personal traversal; start at page zero and supply subsequent pages through pageParam. */
  own: (actor: ContributionActor, matchId: string) =>
    getSessionQueryKey(
      actor.generation,
      getListOwnStreamContributionsQueryKey(actor.accountId, matchId),
    ),

  /** Exact personal version, isolated from other accounts and matches. */
  ownVersion: (actor: ContributionActor, matchId: string, versionId: string) =>
    getSessionQueryKey(
      actor.generation,
      getGetOwnStreamContributionQueryKey(actor.accountId, matchId, versionId),
    ),

  /** Original account's reporting state for one version, never its replacement. */
  ownReport: (actor: ContributionActor, versionId: string) =>
    getSessionQueryKey(
      actor.generation,
      getGetOwnStreamReportQueryKey(actor.accountId, versionId),
    ),

  /** Private queue traversal with all exact search/filter inputs and no page in its key. */
  moderation: (actor: ContributionActor, filters?: ModerationFilters) =>
    getSessionQueryKey(actor.generation, [
      actor.accountId,
      ...getListStreamModerationQueryKey(filters),
    ]),

  /** Private match traversal retaining its current version filter. */
  versions: (
    actor: ContributionActor,
    matchId: string,
    filters?: VersionFilters,
  ) =>
    getSessionQueryKey(actor.generation, [
      actor.accountId,
      ...getListModeratedStreamContributionsQueryKey(matchId, filters),
    ]),

  /** Exact administrative version for the captured moderator. */
  version: (actor: ContributionActor, matchId: string, versionId: string) =>
    getSessionQueryKey(actor.generation, [
      actor.accountId,
      ...getGetModeratedStreamContributionQueryKey(matchId, versionId),
    ]),

  /** Private report traversal, separately identified by match and exact version. */
  reports: (actor: ContributionActor, matchId: string, versionId: string) =>
    getSessionQueryKey(actor.generation, [
      actor.accountId,
      ...getListStreamReportsQueryKey(matchId, versionId),
    ]),

  /** Original-account submission intent; revision and address stay in the command variables. */
  submit: (actor: ContributionActor, matchId: string) => [
    ...ownCommands(actor, matchId),
    ...getCreateStreamContributionMutationKey(),
  ],

  /** Owner changes retain the selected exact version in command variables, or in a member-specific key. */
  updateOwn: (
    actor: ContributionActor,
    matchId: string,
    versionId?: string,
  ) => [
    ...ownCommands(actor, matchId),
    ...getUpdateOwnStreamContributionMutationKey(),
    ...(versionId ? [versionId] : []),
  ],

  /** Reporting intent on one version; no revision or report reason is stored in its key. */
  report: (actor: ContributionActor, versionId: string) =>
    getSessionQueryKey(actor.generation, [
      ...getCreateStreamReportMutationKey(),
      actor.accountId,
      versionId,
    ]),

  /** Direct publication intent; the same stream moderation capability covers every video action. */
  publish: (actor: ContributionActor, matchId: string) =>
    getSessionQueryKey(actor.generation, [
      ...getCreateModeratedStreamContributionMutationKey(),
      actor.accountId,
      matchId,
    ]),

  /** Approval/rejection/withdrawal intent scoped to its original actor and target. */
  moderate: (actor: ContributionActor, matchId: string, versionId: string) =>
    getSessionQueryKey(actor.generation, [
      ...getUpdateModeratedStreamContributionMutationKey(),
      actor.accountId,
      matchId,
      versionId,
    ]),

  /** Reactivation intent on a historical source; the future new version has its own identity. */
  reactivate: (actor: ContributionActor, matchId: string, versionId: string) =>
    getSessionQueryKey(actor.generation, [
      ...getCreateStreamReactivationMutationKey(),
      actor.accountId,
      matchId,
      versionId,
    ]),
};
