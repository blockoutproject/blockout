import { useRouter } from "expo-router";
import type { CollectionProviderEnum } from "../../../../.generated/schemas/index.zod";
import { useAccessAdmission } from "@/features/access/queries/use-access-admission";
import { SupportFlagAction } from "@/features/support";
import { PageHeader } from "@/shared/components/page-header";
import type { CollectionResultCriteria } from "../api/collection-queries";
import { useCollectionSeason } from "../api/use-collection-season";
import { CollectionBilanResultsLoading } from "../components/collection-bilan-result";
import {
  CollectionControlRead,
  CollectionProviderRead,
} from "../components/collection-control-read";
import {
  collectionClubFamilyLabels,
  type ClubCollectionFamily,
} from "../model/collection-club-family";
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
  const reading = useCollectionSeason(seasonId);
  const header = (
    <CollectionBilanHeader
      subtitle={[provider.toUpperCase(), reading.season.data?.label]
        .filter(Boolean)
        .join("  ")}
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

export function CollectionClubBilanVisit({
  family,
  criteria,
}: Readonly<{
  family: ClubCollectionFamily;
  criteria: Pick<CollectionResultCriteria, "query" | "status">;
}>) {
  const router = useRouter();
  const header = (
    <CollectionBilanHeader subtitle={collectionClubFamilyLabels[family]} />
  );
  return (
    <CollectionControlRead
      family={family}
      view="bilan"
      header={header}
      loadingContent={<CollectionBilanResultsLoading />}
    >
      {(control) => (
        <CollectionBilanScreen
          header={header}
          controlId={control.id}
          criteria={criteria}
          searchPlaceholder="Rechercher un club…"
          onSearch={(query) => router.setParams({ query: query ?? "" })}
          onOpenFilters={() =>
            router.push({
              pathname: "/collection/clubs/[family]/bilan-filters",
              params: { family, ...criteria },
            })
          }
        />
      )}
    </CollectionControlRead>
  );
}

function CollectionBilanHeader({ subtitle }: Readonly<{ subtitle: string }>) {
  const { ordinary } = useAccessAdmission();
  return (
    <PageHeader
      title="Bilan"
      subtitle={subtitle}
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
}
