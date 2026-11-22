import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateCollectionSeason,
  getActivateCollectionSeasonMutationKey,
} from "../../../../.generated/mobile";
import type { CollectionSeasonResponse } from "../../../../.generated/schemas/index.zod";
import { useAdministrationCapabilities } from "@/features/access/api/use-administration-capabilities";
import { useOperationalVersionAdmission } from "@/features/access/operational-version-admission";
import { useAccountSession } from "@/features/accounts/current-account";
import { createCollectionQueries } from "./collection-queries";
import { invalidateCollectionSeasons } from "./invalidate-collection-reads";

/** Current F05 identity and F12 grant for collection requests; server authorization remains authoritative. */
export function useCollectionAuthority() {
  const session = useAccountSession();
  const capabilities = useAdministrationCapabilities();
  const version = useOperationalVersionAdmission();
  const enabled =
    capabilities.permissions?.manageCollection === true && version.satisfied;

  /** Supplies original-principal credentials; the server validates the current action grant and eligibility. */
  async function request() {
    const credentials = await session.getCredentials();
    return {
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    };
  }

  return { ...capabilities, session, enabled, request };
}

/** Lists canonical seasons only; reads never create seasons or contact a provider. */
export function useCollectionSeasons() {
  const authority = useCollectionAuthority();
  const query = useQuery(createCollectionQueries(authority).seasons());
  return { authority, query };
}

/** Reads the canonical season shared by provider navigation and lifecycle commands. */
export function useCollectionSeason(seasonId: string) {
  const authority = useCollectionAuthority();
  const options = createCollectionQueries(authority).season(seasonId);
  const season = useQuery(options);
  return { authority, season, seasonKey: options.queryKey };
}

/** Season activation is independent of catalogue refresh and provider activity commands. */
export function useActivateCollectionSeason(seasonId: string) {
  const { authority, season, seasonKey } = useCollectionSeason(seasonId);
  const client = useQueryClient();

  /** An acknowledgement updates the season without hiding a read failure or replacing terminal closure. */
  function acceptSeason(accepted: CollectionSeasonResponse) {
    const current = client.getQueryState<CollectionSeasonResponse | null>(
      seasonKey,
    );
    if (current?.status === "success" && current.data?.state === "preparing") {
      client.setQueryData(seasonKey, accepted);
    }
    void client.invalidateQueries({ queryKey: seasonKey, exact: true });
    invalidateCollectionSeasons(client);
  }

  const activate = useMutation({
    mutationKey: [...seasonKey, ...getActivateCollectionSeasonMutationKey()],
    mutationFn: async () =>
      activateCollectionSeason(seasonId, await authority.request()),
    onSuccess: acceptSeason,
  });

  return { authority, season, activate };
}
