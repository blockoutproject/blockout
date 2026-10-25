import {
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth0 } from "react-native-auth0";
import {
  getPackClassification,
  getPoolClassification,
  setPackClassification,
  setPoolClassification,
  listDivisions,
  setDivisionActivity,
  getGetPackClassificationQueryKey,
  getGetPoolClassificationQueryKey,
  getListDivisionsQueryKey,
  getGetDivisionQueryKey,
  getGetMyAccountQueryKey,
} from "../../../../.generated/mobile";
import type {
  AccountResponse,
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
/** Rechecks the current F05 account and action-specific F12 grant before and after credentials. */
export function useSportingAuthority(
  action: "classification" | "lifecycle" | "divisions",
) {
  const session = useAccountSession();
  const capabilities = useAdministrationCapabilities();
  const version = useOperationalVersionAdmission();
  const auth = useAuth0();
  const client = useQueryClient();
  const allowed =
    action === "classification"
      ? capabilities.permissions?.manageSportingClassification === true
      : action === "lifecycle"
        ? capabilities.permissions?.manageDivisionLifecycle === true
        : capabilities.permissions?.manageSportingClassification === true ||
          capabilities.permissions?.manageDivisionLifecycle === true ||
          capabilities.permissions?.manageSportingPresentation === true;
  const enabled = allowed && version.satisfied;
  /** A held confirmation or delayed credential promise cannot retain a revoked action grant. */
  function assertCurrent() {
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
    const granted =
      action === "classification"
        ? grants?.manageSportingClassification === true
        : action === "lifecycle"
          ? grants?.manageDivisionLifecycle === true
          : grants?.manageSportingClassification === true ||
            grants?.manageDivisionLifecycle === true ||
            grants?.manageSportingPresentation === true;
    if (!granted) throw new ApiError("http", 403);
  }
  /** Supplies request-local credentials and captured session; no mutation is replayed. */
  async function request() {
    assertCurrent();
    const credentials = await auth.getCredentials();
    assertCurrent();
    if (!credentials) throw new ApiError("http", 401);
    return {
      session,
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    };
  }
  return { ...capabilities, session, enabled, request };
}
/** Reads complete settings and submits a single revision-guarded correction through generated transport. */
export function useClassification(target: ClassificationTarget) {
  const authority = useSportingAuthority("classification");
  const client = useQueryClient();
  const queryKey = getSessionQueryKey(
    authority.session.generation,
    target.kind === "pack"
      ? getGetPackClassificationQueryKey(target.id)
      : getGetPoolClassificationQueryKey(target.id),
  );
  const saving = useIsMutating({ mutationKey: queryKey }) > 0;
  const query = useQuery({
    queryKey,
    enabled: authority.enabled,
    gcTime: 0,
    queryFn: async ({ signal }) => {
      const options = { ...(await authority.request()), signal };
      return target.kind === "pack"
        ? getPackClassification(target.id, options)
        : getPoolClassification(target.id, options);
    },
  });
  const save = useMutation({
    mutationKey: queryKey,
    gcTime: 0,
    mutationFn: async (body: SetClassificationRequest) => {
      const options = await authority.request();
      const accepted = await (target.kind === "pack"
        ? setPackClassification(target.id, body, options)
        : setPoolClassification(target.id, body, options));
      await client.cancelQueries({ queryKey, exact: true });
      if (!authority.session.isCurrent(authority.session.generation))
        throw new ApiError("cancelled");
      client.setQueryData(queryKey, accepted);
      // Pack changes can affect inherited pool revisions; collection eligibility and public reads must be refreshed.
      void client.invalidateQueries({
        predicate: ({ queryKey: key }) =>
          key !== queryKey &&
          key.some(
            (part) =>
              typeof part === "string" &&
              (part.includes("/classification") ||
                part.startsWith("/collection/") ||
                /^\/(teams|pools|matches)/.test(part)),
          ),
      });
      return accepted;
    },
  });
  return { authority, query, save, saving };
}
/** Configuration list includes inactive entries for lifecycle context; consumers filter assignable choices. */
export function useDivisions() {
  const authority = useSportingAuthority("divisions");
  const query = useQuery({
    queryKey: getSessionQueryKey(
      authority.session.generation,
      getListDivisionsQueryKey({ includeInactive: true }),
    ),
    enabled: authority.enabled,
    gcTime: 0,
    queryFn: async ({ signal }) =>
      listDivisions(
        { includeInactive: true },
        { ...(await authority.request()), signal },
      ),
  });
  return { authority, query };
}
/** Activity is a separate full-state command and always reconciles the original division on explicit reread. */
export function useDivisionActivity(id: string) {
  const authority = useSportingAuthority("lifecycle");
  const client = useQueryClient();
  const queryKey = getSessionQueryKey(authority.session.generation, [
    ...getGetDivisionQueryKey(id),
    "activity",
  ]);
  const saving = useIsMutating({ mutationKey: queryKey }) > 0;
  const save = useMutation({
    mutationKey: queryKey,
    gcTime: 0,
    mutationFn: async (body: SetDivisionActivityRequest) => {
      const accepted = await setDivisionActivity(
        id,
        body,
        await authority.request(),
      );
      if (!authority.session.isCurrent(authority.session.generation))
        throw new ApiError("cancelled");
      void client.invalidateQueries({
        predicate: ({ queryKey: key }) =>
          key !== queryKey &&
          key.some(
            (part) =>
              typeof part === "string" &&
              (part.startsWith("/administration/divisions") ||
                part.includes("/classification") ||
                part.startsWith("/collection/") ||
                /^\/(teams|pools|matches)/.test(part)),
          ),
      });
      return accepted;
    },
  });
  return { authority, save, saving };
}
