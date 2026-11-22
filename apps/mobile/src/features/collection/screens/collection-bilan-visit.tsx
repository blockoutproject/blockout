import { useRouter } from "expo-router";
import type { CollectionProviderEnum } from "../../../../.generated/schemas/index.zod";
import { useAccessAdmission } from "@/features/access/queries/use-access-admission";
import { SupportFlagAction } from "@/features/support";
import { PageHeader } from "@/shared/components/page-header";
import type { CollectionResultCriteria } from "../api/collection-queries";
import { useCollectionSeason } from "../api/use-collection-season";
import { CollectionBilanResultsLoading } from "../components/collection-bilan-result";
import { CollectionProviderRead } from "../components/collection-provider-read";
import { collectionSourceHref } from "../model/collection-hrefs";
import { CollectionBilanScreen } from "./collection-bilan-screen";

export function CollectionBilanVisit({
  seasonId,
  provider,
  criteria,
}: Readonly<{
  seasonId: string;
  provider: CollectionProviderEnum;
  criteria: CollectionResultCriteria;
}>) {
  const router = useRouter();
  const { ordinary } = useAccessAdmission();
  const reading = useCollectionSeason(seasonId);
  const header = (
    <PageHeader
      title="Bilan"
      subtitle={[provider.toUpperCase(), reading.season.data?.label]
        .filter(Boolean)
        .join("  ")}
      action={
        ordinary && (
          <SupportFlagAction
            label="Contacter le support"
            origin={{ screen: "collection-bilan" }}
          />
        )
      }
    />
  );
  return (
    <CollectionProviderRead
      provider={provider}
      reading={reading}
      view="bilan"
      header={header}
      loadingContent={<CollectionBilanResultsLoading />}
    >
      {(control) => (
        <CollectionBilanScreen
          header={header}
          controlId={control.id}
          criteria={criteria}
          onSearch={(query) => router.setParams({ query: query ?? "" })}
          onOpenFilters={() =>
            router.push({
              pathname:
                "/collection/[seasonId]/controls/[provider]/bilan-filters",
              params: { seasonId, provider, ...criteria },
            })
          }
          onViewSource={(source) =>
            // A stack push leaves the current Bilan criteria and native list mounted for Back.
            router.push(collectionSourceHref(seasonId, source))
          }
        />
      )}
    </CollectionProviderRead>
  );
}
