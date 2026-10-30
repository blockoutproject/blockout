import {
  getCreateStreamContributionMutationKey,
  getCreateStreamReportMutationKey,
  getGetOwnStreamContributionQueryKey,
  getGetOwnStreamReportQueryKey,
  getListOwnStreamContributionsQueryKey,
  getUpdateOwnStreamContributionMutationKey,
} from "../../../../.generated/mobile";
/** Original business account for generated owner endpoints. */
type ContributionActor = { readonly accountId: string };
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
};
