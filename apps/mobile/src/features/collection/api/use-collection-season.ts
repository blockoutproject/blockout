import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateCollectionSeason,
  closeCollectionSeason,
  getActivateCollectionSeasonMutationKey,
  getCloseCollectionSeasonMutationKey,
  getListCollectionControlsQueryKey,
} from "../../../../.generated/mobile";
import type { CollectionSeasonResponse } from "../../../../.generated/schemas/index.zod";
import { useAdministrationCapabilities } from "@/features/access/api/use-administration-capabilities";
import { useOperationalVersionAdmission } from "@/features/access/operational-version-admission";
import { useAccountSession } from "@/features/accounts/current-account";
import type { SeasonCommand } from "../model/season-command";
import { createCollectionQueries } from "./collection-queries";
import { invalidateCollectionSeason } from "./invalidate-collection-reads";

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

/** Lifecycle writes target only the selected season; the server checks authorization and eligibility. */
export function useCollectionSeasonCommand(
  seasonId: string,
  command: SeasonCommand,
) {
  const { authority, season, seasonKey } = useCollectionSeason(seasonId);
  const client = useQueryClient();
  const activating = command === "activation";
  const commandKey = activating
    ? getActivateCollectionSeasonMutationKey()
    : getCloseCollectionSeasonMutationKey();

  /** Publish acknowledged closure before rereading, and keep a current read failure visible. */
  function acceptSeason(accepted: CollectionSeasonResponse) {
    const current = client.getQueryState<CollectionSeasonResponse>(seasonKey);
    if (
      current?.status === "success" &&
      (accepted.state === "closed" || current.data?.state === "preparing")
    ) {
      client.setQueryData(seasonKey, accepted);
    }
    invalidateCollectionSeason(client, seasonId);
    if (!activating) {
      void client.invalidateQueries({
        queryKey: getListCollectionControlsQueryKey({ seasonId }),
        exact: true,
      });
    }
  }

  const submit = useMutation({
    mutationKey: [...seasonKey, ...commandKey],
    mutationFn: async (confirmation: string) => {
      const options = await authority.request();
      return activating
        ? activateCollectionSeason(seasonId, options)
        : closeCollectionSeason(seasonId, { confirmation }, options);
    },
    onSuccess: acceptSeason,
  });

  return { authority, season, submit };
}
