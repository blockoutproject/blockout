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

/** Original business account for generated owner endpoints. */
type ContributionActor = { readonly accountId: string };
/** Page belongs to TanStack's infinite-query pageParam, rather than to the traversal identity. */
type ModerationFilters = Omit<ListStreamModerationParams, "page">;
/** Exact version selection retained for every page in one match traversal. */
type VersionFilters = Omit<ListModeratedStreamContributionsParams, "page">;
/** Generated keys identify each original resource, selection and mutation. The native private client owns account isolation. */
export const contributionKeys = {
  /** Personal traversal; start at page zero and supply subsequent pages through pageParam. */
  own: (actor: ContributionActor, matchId: string) =>
    getListOwnStreamContributionsQueryKey(actor.accountId, matchId),
  /** Exact personal version, isolated from other accounts and matches. */
  ownVersion: (actor: ContributionActor, matchId: string, versionId: string) =>
    getGetOwnStreamContributionQueryKey(actor.accountId, matchId, versionId),
  /** Original account's reporting state for one version, never its replacement. */
  ownReport: (actor: ContributionActor, versionId: string) =>
    getGetOwnStreamReportQueryKey(actor.accountId, versionId),
  /** Private queue traversal with all exact search/filter inputs and no page in its key. */
  moderation: (actor: ContributionActor, filters?: ModerationFilters) => [
    actor.accountId,
    ...getListStreamModerationQueryKey(filters),
  ],
  /** Private match traversal retaining its current version filter. */
  versions: (
    actor: ContributionActor,
    matchId: string,
    filters?: VersionFilters,
  ) => [
    actor.accountId,
    ...getListModeratedStreamContributionsQueryKey(matchId, filters),
  ],
  /** Exact administrative version for the captured moderator. */
  version: (actor: ContributionActor, matchId: string, versionId: string) => [
    actor.accountId,
    ...getGetModeratedStreamContributionQueryKey(matchId, versionId),
  ],
  /** Private report traversal, separately identified by match and exact version. */
  reports: (actor: ContributionActor, matchId: string, versionId: string) => [
    actor.accountId,
    ...getListStreamReportsQueryKey(matchId, versionId),
  ],
  /** Original-account submission intent; revision and address stay in the command variables. */
  submit: (actor: ContributionActor, matchId: string) => [
    actor.accountId,
    matchId,
    ...getCreateStreamContributionMutationKey(),
  ],
  /** Owner changes retain the selected exact version in command variables, or in a member-specific key. */
  updateOwn: (
    actor: ContributionActor,
    matchId: string,
    versionId?: string,
  ) => [
    actor.accountId,
    matchId,
    ...getUpdateOwnStreamContributionMutationKey(),
    ...(versionId ? [versionId] : []),
  ],
  /** Reporting intent on one version; no revision or report reason is stored in its key. */
  report: (actor: ContributionActor, versionId: string) => [
    ...getCreateStreamReportMutationKey(),
    actor.accountId,
    versionId,
  ],
  /** Direct publication intent; the same stream moderation capability covers every video action. */
  publish: (actor: ContributionActor, matchId: string) => [
    ...getCreateModeratedStreamContributionMutationKey(),
    actor.accountId,
    matchId,
  ],
  /** Approval/rejection/withdrawal intent scoped to its original actor and target. */
  moderate: (actor: ContributionActor, matchId: string, versionId: string) => [
    ...getUpdateModeratedStreamContributionMutationKey(),
    actor.accountId,
    matchId,
    versionId,
  ],
  /** Reactivation intent on a historical source; the future new version has its own identity. */
  reactivate: (
    actor: ContributionActor,
    matchId: string,
    versionId: string,
  ) => [
    ...getCreateStreamReactivationMutationKey(),
    actor.accountId,
    matchId,
    versionId,
  ],
};
