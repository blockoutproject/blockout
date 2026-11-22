import { useLocalSearchParams, useRouter } from "expo-router";
import { CollectionBilanFilters } from "@/features/collection/components/collection-bilan-filters";
import { collectionBilanRouteCriteria } from "@/features/collection/model/collection-bilan-route-criteria";

export default function CollectionBilanFiltersRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ seasonId: string; provider: string }>();
  const { seasonId, provider } = params;
  if (provider !== "ffvb" && provider !== "lnv") {
    return null;
  }
  return (
    <CollectionBilanFilters
      seasonId={seasonId}
      provider={provider}
      initial={collectionBilanRouteCriteria(params)}
      onApply={(criteria) =>
        router.dismissTo({
          pathname: "/collection/[seasonId]/controls/[provider]/bilan",
          params: {
            seasonId,
            provider,
            query: criteria.query ?? "",
            status: criteria.status ?? "",
            sourceId: criteria.sourceId ?? "",
            stage: criteria.stage ?? "",
          },
        })
      }
      onClose={() => router.back()}
    />
  );
}
