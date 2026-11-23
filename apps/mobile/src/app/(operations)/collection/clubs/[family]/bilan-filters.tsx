import { useLocalSearchParams, useRouter } from "expo-router";
import { CollectionBilanFilters } from "@/features/collection/components/collection-bilan-filters";
import { isClubCollectionFamily } from "@/features/collection/model/collection-club-family";
import { collectionClubBilanHref } from "@/features/collection/model/collection-hrefs";
import { collectionBilanSearchCriteria } from "@/features/collection/model/collection-route-params";
import { Sheet, SheetContent } from "@/shared/components/sheet";
import { ErrorState } from "@/shared/components/state-card";

export default function CollectionClubBilanFiltersRoute() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { family } = params;
  const onClose = () => router.back();
  return isClubCollectionFamily(family) ? (
    <CollectionBilanFilters
      initial={collectionBilanSearchCriteria(params)}
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
