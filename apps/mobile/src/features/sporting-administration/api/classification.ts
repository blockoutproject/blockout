import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getGetDivisionQueryKey,
  getSetDivisionActivityMutationKey,
  getSetPackClassificationMutationKey,
  getSetPoolClassificationMutationKey,
  setDivisionActivity,
  setPackClassification,
  setPoolClassification,
} from "../../../../.generated/mobile";
import type {
  AccountPermissionsResponse,
  SetClassificationRequest,
  SetDivisionActivityRequest,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { useAdministrationCapabilities } from "../../access/api/use-administration-capabilities";
import { canReadDivisions } from "../../access/division-catalog-access";
import { useOperationalVersionAdmission } from "../../access/operational-version-admission";
import { useAccountSession } from "../../accounts/current-account";
import {
  invalidateClassificationReads,
  invalidateDivisionReads,
  invalidateSportingReads,
} from "./invalidate-sporting-reads";
import { createSportingAdministrationQueries } from "./sporting-administration-queries";

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
  return canReadDivisions(grants);
}
/** Presents the current action grant and prepares original-principal credentials. */
export function useSportingAuthority(action: SportingAction) {
  const session = useAccountSession();
  const capabilities = useAdministrationCapabilities();
  const version = useOperationalVersionAdmission();
  const enabled =
    hasSportingPermission(capabilities.permissions, action) &&
    version.satisfied;
  /** The server validates the action grant and revision after native principal credential preparation. */
  async function request(signal?: AbortSignal) {
    const credentials = await session.getCredentials();
    if (!credentials) throw new ApiError("http", 401);
    return {
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
  /** Refreshes the edited resource and dependent views after an explicit mutation attempt. */
  function accept() {
    void client.invalidateQueries({ queryKey, exact: true });
    invalidateDivisionReads(client, queryKey);
    invalidateClassificationReads(client);
    invalidateSportingReads(client);
  }
  const save = useMutation({
    retry: false,
    networkMode: "always",
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
    onSettled: accept,
  });
  return { authority, query, save, queryKey };
}
/** Configuration list includes inactive entries for lifecycle context; consumers filter assignable choices. */
export function useDivisions() {
  const authority = useSportingAuthority("divisions");
  const options = createSportingAdministrationQueries(authority).divisions();
  const query = useQuery(options);
  return { authority, query, queryKey: options.queryKey };
}
/** Activity is a separate desired-state mutation with normal invalidation. */
export function useDivisionActivity(id: string) {
  const authority = useSportingAuthority("lifecycle");
  const client = useQueryClient();
  const queryKey = [...getGetDivisionQueryKey(id)];
  /** Invalidates the original division and affected administration/public projections after settlement. */
  function accept() {
    void client.invalidateQueries({ queryKey, exact: true });
    invalidateDivisionReads(client, queryKey);
    invalidateClassificationReads(client);
    invalidateSportingReads(client);
  }
  const save = useMutation({
    retry: false,
    networkMode: "always",
    mutationKey: [...queryKey, ...getSetDivisionActivityMutationKey()],
    mutationFn: async (body: SetDivisionActivityRequest) =>
      setDivisionActivity(id, body, await authority.request()),
    onSettled: accept,
  });
  return { authority, save, queryKey };
}
