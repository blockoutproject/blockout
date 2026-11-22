import { useLocalSearchParams, useRouter } from "expo-router";
import { SourceFiltersSheet } from "@/features/collection/components/source-filters-sheet";
import { collectionProviderFromRoute } from "@/features/collection/model/collection-route-params";
import { sourceFiltersFromRoute } from "@/features/collection/model/source-catalogue";
import { Sheet, SheetContent } from "@/shared/components/sheet";
import { ErrorState } from "@/shared/components/state-card";

export default function SourceFiltersRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    seasonId: string;
    provider: string;
    status?: string;
    scope?: string;
  }>();
  const provider = collectionProviderFromRoute(params.provider);
  const onClose = () => router.back();
  if (!provider) {
    return (
      <Sheet title="Filtres" onClose={onClose}>
        <SheetContent>
          <ErrorState />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <SourceFiltersSheet
      provider={provider}
      initial={sourceFiltersFromRoute(params)}
      onClose={onClose}
      onApply={({ status, scope }) =>
        router.dismissTo({
          pathname: "/collection/[seasonId]/controls/[provider]",
          params: {
            seasonId: params.seasonId,
            provider,
            tab: "sources",
            status: status ?? "",
            scope: scope ?? "",
          },
        })
      }
    />
  );
}
