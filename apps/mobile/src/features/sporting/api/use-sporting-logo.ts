import { useQuery } from "@tanstack/react-query";
import type { SportingIdentityResponse } from "../../../../.generated/schemas/index.zod";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import { consultationOpeningPolicy } from "./consultation-queries";
import { useConsultationQueries } from "./use-consultation-queries";

/**
 * Public artwork goes directly to native Image. Only explicit bypass retains the generated
 * credentialed binary transport. An existing resource-local error withdraws both image layers;
 * observing that exact JSON key initiates no detail read and edits no neighbouring projection.
 */
export function useSportingLogo(
  identity: SportingIdentityResponse,
  kind: "club" | "team" | "division",
) {
  const { bypass } = useOrdinaryRequest();
  const queries = useConsultationQueries();
  const options =
    kind === "club"
      ? queries.clubLogo(identity.id)
      : kind === "team"
        ? queries.teamLogo(identity.id)
        : queries.divisionLogo(identity.id);
  const detail =
    kind === "club"
      ? queries.club(identity.id)
      : kind === "team"
        ? queries.team(identity.id)
        : options;
  const resource = useQuery<unknown>({
    queryKey: detail.queryKey,
    queryFn: detail.queryFn,
    enabled: false,
    subscribed: !!identity.logoUrl,
  });
  const binary = useQuery({
    ...options,
    ...consultationOpeningPolicy,
    enabled: !!bypass && !!identity.logoUrl,
    subscribed: !!bypass && !!identity.logoUrl,
  });
  const withdrawn = resource.isError && resource.data === undefined;
  const uri = withdrawn
    ? undefined
    : bypass
      ? binary.data
      : publicLogoUrl(identity.logoUrl);
  return {
    uri,
    loading: !withdrawn && !!bypass && !!identity.logoUrl && binary.isPending,
    error:
      withdrawn || (!!identity.logoUrl && (bypass ? binary.isError : !uri)),
  };
}

/** Resolves only credential-free references on the configured backend; malformed or foreign URLs stay absent. */
function publicLogoUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const base = new URL(process.env.EXPO_PUBLIC_API_URL ?? "");
    const destination = new URL(value, base);
    if (
      !["http:", "https:"].includes(base.protocol) ||
      destination.origin !== base.origin ||
      base.username ||
      base.password ||
      destination.username ||
      destination.password
    )
      return undefined;
    return destination.href;
  } catch {
    return undefined;
  }
}
