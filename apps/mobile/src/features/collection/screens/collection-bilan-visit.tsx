import { useRouter } from "expo-router";
import { Flag } from "lucide-react-native";
import type { CollectionProviderEnum } from "../../../../.generated/schemas/index.zod";
import { useAccessAdmission } from "@/features/access/queries/use-access-admission";
import { supportHref } from "@/features/support";
import { IconButton } from "@/shared/components/icon-button";
import { PageHeader } from "@/shared/components/page-header";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import type { CollectionResultCriteria } from "../api/collection-queries";
import { useCollectionSeason } from "../api/use-source-preparation";
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
  const { colors } = useTheme();
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
          <IconButton
            label="Contacter le support"
            onPress={() =>
              router.push(supportHref({ screen: "collection-bilan" }))
            }
          >
            <Flag
              accessible={false}
              color={colors.icon}
              size={tokens.size.icon.lg}
            />
          </IconButton>
        )
      }
    />
  );
  return (
    <CollectionProviderRead
      provider={provider}
      reading={reading}
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
