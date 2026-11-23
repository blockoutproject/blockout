import { useLocalSearchParams, useRouter } from "expo-router";
import { CollectionBilanFilters } from "@/features/collection/components/collection-bilan-filters";
import {
  collectionBilanRouteCriteria,
  collectionProviderFromRoute,
} from "@/features/collection/model/collection-route-params";
import { collectionBilanHref } from "@/features/collection/model/collection-hrefs";
import { Sheet, SheetContent } from "@/shared/components/sheet";
import { ErrorState } from "@/shared/components/state-card";

export default function CollectionBilanFiltersRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ seasonId: string; provider: string }>();
  const { seasonId } = params;
  const provider = collectionProviderFromRoute(params.provider);
  if (!provider) {
    return (
      <Sheet title="Filtres" onClose={() => router.back()}>
        <SheetContent>
          <ErrorState />
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <CollectionBilanFilters
      competition={{ seasonId, provider }}
      initial={collectionBilanRouteCriteria(params)}
      onApply={(criteria) =>
        router.dismissTo(collectionBilanHref(seasonId, provider, criteria))
      }
      onClose={() => router.back()}
    />
  );
}
