import { useLocalSearchParams, useRouter } from "expo-router";
import { CollectionBilanFilters } from "@/features/collection/components/collection-bilan-filters";
import { collectionClubFamilyFromRoute } from "@/features/collection/model/collection-club-family";
import { collectionClubBilanHref } from "@/features/collection/model/collection-hrefs";
import { collectionClubBilanRouteCriteria } from "@/features/collection/model/collection-route-params";
import { Sheet, SheetContent } from "@/shared/components/sheet";
import { ErrorState } from "@/shared/components/state-card";

export default function CollectionClubBilanFiltersRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const family = collectionClubFamilyFromRoute(params.family);
  const onClose = () => router.back();
  return family ? (
    <CollectionBilanFilters
      initial={collectionClubBilanRouteCriteria(params)}
      onApply={(criteria) =>
        router.dismissTo(collectionClubBilanHref(family, criteria))
      }
      onClose={onClose}
    />
  ) : (
    <Sheet title="Filtres" onClose={onClose}>
      <SheetContent>
        <ErrorState />
      </SheetContent>
    </Sheet>
  );
}
