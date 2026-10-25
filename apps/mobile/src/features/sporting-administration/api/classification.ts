import { publishSportingRevision } from "./publish-sporting-revision";
import { requiresPresentationReread } from "./presentation-recovery";
import { requiresRevisionRead } from "../../../shared/api/mutation-recovery";
import { useCommand } from "../../../shared/query/use-command";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createSportingAdministrationQueries } from "./sporting-administration-queries";
import {
  invalidateSportingReads,
  invalidateClassificationReads,
  invalidateDivisionReads,
} from "./invalidate-sporting-reads";
import { useAuth0 } from "react-native-auth0";
import {
  setPackClassification,
  setPoolClassification,
  setDivisionActivity,
  getGetDivisionQueryKey,
  getSetPackClassificationMutationKey,
  getSetPoolClassificationMutationKey,
  getSetDivisionActivityMutationKey,
  getGetMyAccountQueryKey,
} from "../../../../.generated/mobile";
import type {
  AccountResponse,
  ClassificationDetailResponse,
  DivisionResponse,
  AccountPermissionsResponse,
  SetClassificationRequest,
  SetDivisionActivityRequest,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import { useAccountSession } from "../../accounts/current-account";
import { useAdministrationCapabilities } from "../../access/api/use-administration-capabilities";
import { useOperationalVersionAdmission } from "../../access/operational-version-admission";

/** Original correction scope; neither presentation nor identity is writable here. */
export interface ClassificationTarget {
  kind: "pack" | "pool";
  id: string;
}
/** Distinct server permissions; division reads accept any sporting-administration capability. */
type SportingAction =
  "classification" | "lifecycle" | "divisions" | "presentation";
/** The canonical action grants are shared by rendered availability and request-time authorization. */
function hasSportingPermission(
  grants: AccountPermissionsResponse | undefined,
  action: SportingAction,
) {
  if (action === "presentation")
    return grants?.manageSportingPresentation === true;
  if (action === "classification")
    return grants?.manageSportingClassification === true;
  if (action === "lifecycle") return grants?.manageDivisionLifecycle === true;
  return (
    grants?.manageSportingClassification === true ||
    grants?.manageDivisionLifecycle === true ||
    grants?.manageSportingPresentation === true
  );
}
/** Rechecks the current F05 account and action-specific F12 grant before and after credentials. */
export function useSportingAuthority(action: SportingAction) {
  const session = useAccountSession();
  const capabilities = useAdministrationCapabilities();
  const version = useOperationalVersionAdmission();
  const auth = useAuth0();
  const client = useQueryClient();
  const enabled =
    hasSportingPermission(capabilities.permissions, action) &&
    version.satisfied;
  /** A held confirmation or delayed credential promise cannot retain a revoked action grant. */
  function assertCurrent(requestedAction: SportingAction) {
    if (!session.isCurrent(session.generation)) throw new ApiError("cancelled");
    version.assertCurrent();
    const current = client.getQueryState<AccountResponse>(
      getSessionQueryKey(session.generation, getGetMyAccountQueryKey()),
    );
    const grants =
      current?.status === "success" &&
      current.data?.accountId === session.accountId
        ? current.data.permissions
        : undefined;
    if (!hasSportingPermission(grants, requestedAction))
      throw new ApiError("http", 403);
  }
  /**
   * Supplies request-local credentials and cancellation after checking the selected action twice.
   * Reads default to the observer's resource grant; an editor may request its stricter command grant.
   */
  async function request(
    signal?: AbortSignal,
    requestedAction: SportingAction = action,
  ) {
    assertCurrent(requestedAction);
    const credentials = await auth.getCredentials();
    assertCurrent(requestedAction);
    if (!credentials) throw new ApiError("http", 401);
    return {
      session,
      signal,
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    };
  }
  return { ...capabilities, session, enabled, request };
}
/** Reads complete settings and submits a single revision-guarded correction through generated transport. */
export function useClassification(target: ClassificationTarget) {
  const authority = useSportingAuthority("classification");
  const client = useQueryClient();
  const queries = createSportingAdministrationQueries(authority);
  const options =
    target.kind === "pack"
      ? queries.packClassification(target.id)
      : queries.poolClassification(target.id);
  const queryKey = options.queryKey;
  const query = useQuery(options);
  /** Publishes the accepted correction without replacing a distinct revision observed during its request. */
  async function accept(
    accepted: ClassificationDetailResponse,
    body: SetClassificationRequest,
  ) {
    await client.cancelQueries({ queryKey, exact: true });
    if (!authority.session.isCurrent(authority.session.generation)) return;
    publishSportingRevision(client, queryKey, accepted, body.revision);
    invalidateClassificationReads(client, queryKey);
    invalidateSportingReads(client);
  }
  const save = useCommand(
    {
      mutationKey: [
        ...queryKey,
        ...(target.kind === "pack"
          ? getSetPackClassificationMutationKey()
          : getSetPoolClassificationMutationKey()),
      ],
      mutationFn: async (body: SetClassificationRequest) => {
        const options = await authority.request();
        return target.kind === "pack"
          ? setPackClassification(target.id, body, options)
          : setPoolClassification(target.id, body, options);
      },
      onSuccess: accept,
    },
    { groupKey: queryKey, requiresRead: requiresRevisionRead },
  );
  return { authority, query, save, queryKey };
}
/** Configuration list includes inactive entries for lifecycle context; consumers filter assignable choices. */
export function useDivisions() {
  const authority = useSportingAuthority("divisions");
  const options = createSportingAdministrationQueries(authority).divisions();
  const query = useQuery(options);
  return { authority, query, queryKey: options.queryKey };
}
/** Activity is a separate full-state command and always reconciles the original division on explicit reread. */
export function useDivisionActivity(id: string) {
  const authority = useSportingAuthority("lifecycle");
  const client = useQueryClient();
  const queryKey = getSessionQueryKey(authority.session.generation, [
    ...getGetDivisionQueryKey(id),
  ]);
  /** Updates the original division after acceptance and refreshes every affected administration/public projection. */
  async function accept(
    accepted: DivisionResponse,
    body: SetDivisionActivityRequest,
  ) {
    await client.cancelQueries({ queryKey, exact: true });
    if (!authority.session.isCurrent(authority.session.generation)) return;
    publishSportingRevision(client, queryKey, accepted, body.revision);
    invalidateDivisionReads(client, queryKey);
    invalidateClassificationReads(client);
    invalidateSportingReads(client);
  }
  const save = useCommand(
    {
      mutationKey: [...queryKey, ...getSetDivisionActivityMutationKey()],
      mutationFn: async (body: SetDivisionActivityRequest) =>
        setDivisionActivity(id, body, await authority.request()),
      onSuccess: accept,
    },
    { groupKey: queryKey, requiresRead: requiresPresentationReread },
  );
  return { authority, save, queryKey };
}
