import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  getGetDivisionQueryKey,
  getGetMyAccountQueryKey,
  getSetDivisionActivityMutationKey,
  getSetPackClassificationMutationKey,
  getSetPoolClassificationMutationKey,
  setDivisionActivity,
  setPackClassification,
  setPoolClassification,
} from "../../../../.generated/mobile";
import type {
  AccountPermissionsResponse,
  AccountResponse,
  ClassificationDetailResponse,
  SetClassificationRequest,
  SetDivisionActivityRequest,
} from "../../../../.generated/schemas/index.zod";
import { useAdministrationCapabilities } from "@/features/access/api/use-administration-capabilities";
import { canReadDivisions } from "@/features/access/division-catalog-access";
import { useOperationalVersionAdmission } from "@/features/access/operational-version-admission";
import { useAccountSession } from "@/features/accounts/current-account";
import {
  invalidateClassificationReads,
  invalidateDivisionCatalogue,
  invalidateMappingReads,
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
  if (action === "presentation") {
    return grants?.manageSportingPresentation === true;
  }
  if (action === "classification") {
    return grants?.manageSportingClassification === true;
  }
  if (action === "lifecycle") {
    return grants?.manageDivisionLifecycle === true;
  }
  return canReadDivisions(grants);
}

/** A delayed lifecycle command must still belong to the original account and its current grant. */
export function hasCurrentDivisionLifecycleGrant(
  client: QueryClient,
  accountId: string | null,
) {
  const account = client.getQueryData<AccountResponse | null>(
    getGetMyAccountQueryKey(),
  );
  return (
    account?.accountId === accountId &&
    hasSportingPermission(account.permissions, "lifecycle")
  );
}

/** Presents the current action grant and prepares original-principal credentials. */
export function useSportingAuthority(action: SportingAction) {
  const session = useAccountSession();
  const capabilities = useAdministrationCapabilities();
  const version = useOperationalVersionAdmission();
  const enabled =
    hasSportingPermission(capabilities.permissions, action) &&
    version.satisfied;

  /** The server validates the current action grant after native principal credential preparation. */
  async function request(signal?: AbortSignal) {
    const credentials = await session.getCredentials();
    return {
      signal,
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    };
  }

  return { ...capabilities, session, enabled, request };
}

/** Reads complete settings and submits a single atomic correction through generated transport. */
export function useClassification(
  target: ClassificationTarget,
  authority: ReturnType<typeof useSportingAuthority>,
) {
  const client = useQueryClient();
  const queries = createSportingAdministrationQueries(authority);
  const options =
    target.kind === "pack"
      ? queries.packClassification(target.id)
      : queries.poolClassification(target.id);
  const queryKey = options.queryKey;
  const query = useQuery(options);

  /** Refreshes the edited resource and dependent views after an explicit mutation attempt. */
  function invalidateReads() {
    void client.invalidateQueries({ queryKey, exact: true });
    invalidateDivisionCatalogue(client);
    invalidateClassificationReads(client, queryKey);
    invalidateMappingReads(client);
    invalidateSportingReads(client);
  }

  const save = useMutation({
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
    // An acknowledged save cannot restore data withdrawn by a current refusal.
    onSuccess: (accepted) => {
      client.setQueryData<ClassificationDetailResponse | null>(
        queryKey,
        (current) => (current === null ? undefined : accepted),
      );
    },
    onSettled: invalidateReads,
  });
  return { query, save };
}

/** Configuration list includes inactive entries for lifecycle context; consumers filter assignable choices. */
export function useDivisions(enabled = true) {
  const authority = useSportingAuthority("divisions");
  const options = createSportingAdministrationQueries(authority).divisions();
  const query = useQuery({ ...options, enabled: options.enabled && enabled });
  return { authority, query, queryKey: options.queryKey };
}

/** Activity is a separate desired-state mutation with normal invalidation. */
export function useDivisionActivity(id: string) {
  const authority = useSportingAuthority("lifecycle");
  const client = useQueryClient();
  const queryKey = getGetDivisionQueryKey(id);

  /** Invalidates the original division and affected administration/public projections after settlement. */
  function invalidateReads() {
    void client.invalidateQueries({ queryKey, exact: true });
    invalidateDivisionCatalogue(client);
    invalidateClassificationReads(client);
    invalidateSportingReads(client);
  }

  const save = useMutation({
    mutationKey: [...queryKey, ...getSetDivisionActivityMutationKey()],
    mutationFn: async (body: SetDivisionActivityRequest) => {
      const options = await authority.request();
      if (
        !hasCurrentDivisionLifecycleGrant(
          client,
          authority.session.accountId,
        ) ||
        client.getQueryData(queryKey) == null
      ) {
        return undefined;
      }
      return setDivisionActivity(id, body, options);
    },
    onSettled: (accepted, error) => {
      // A withdrawn confirmation has no server result to reconcile.
      if (accepted || error) {
        invalidateReads();
      }
    },
  });
  return { authority, save, queryKey };
}
