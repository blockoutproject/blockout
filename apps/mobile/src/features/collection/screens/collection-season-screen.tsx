import { collectionProviderHref } from "../model/collection-hrefs";
import { seasonStatus } from "../components/collection-season-summary";
import { CollectionDestinationLink } from "../components/collection-destination-link";
import {
  AccessFeedback,
  isAccessLoading,
} from "@/features/access/components/access-feedback";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { IconButton } from "@/shared/components/icon-button";
import { PageHeader } from "@/shared/components/page-header";
import { Page, PageScrollView, PageContent } from "@/shared/components/page";
import { PageReadState } from "@/shared/components/page-read-state";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { StatusBadge } from "@/shared/components/status-badge";
import { useRouter } from "expo-router";
import { Globe, Power, Trophy } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "@/shared/components/button";
import { CollectionLoading } from "../components/collection-loading";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { useCollectionSeason } from "../api/use-collection-season";
import { seasonCommands, type SeasonCommand } from "../model/season-command";

/** Opens provider journeys and the selected season's available lifecycle commands. */
export function CollectionSeasonScreen({
  seasonId,
}: Readonly<{ seasonId: string }>) {
  const { authority, season } = useCollectionSeason(seasonId);
  const router = useRouter();
  const { colors } = useTheme();
  const failed = hasReadError(season);
  const pending = !authority.enabled
    ? isAccessLoading(authority)
    : !failed && season.isLoading;
  const current = authority.enabled && !failed ? season.data : undefined;
  const preparing = current?.state === "preparing";
  const command = preparing ? "activation" : "closure";

  function confirm(command: SeasonCommand) {
    router.push({
      pathname:
        command === "activation"
          ? "/collection/[seasonId]/activation"
          : "/collection/[seasonId]/closure",
      params: { seasonId },
    });
  }

  return (
    <Page
      header={
        <PageHeader
          title={current?.label ?? "Saison"}
          action={
            current &&
            current.state !== "closed" && (
              <IconButton
                label={seasonCommands[command].label}
                onPress={() => confirm(command)}
              >
                <Power
                  accessible={false}
                  color={preparing ? colors.icon : colors.error}
                  size={tokens.size.icon.lg}
                />
              </IconButton>
            )
          }
        />
      }
    >
      {current ? (
        <PageScrollView
          refreshControl={
            authority.sessionStatus === "authenticated" ? (
              <DataRefreshControl
                fetching={season.isFetching}
                onRefresh={() => season.refetch({ cancelRefetch: false })}
              />
            ) : undefined
          }
        >
          <PageContent>
            <View style={styles.heading}>
              <Text
                accessibilityRole="header"
                style={[
                  tokens.typography.strong,
                  styles.headingText,
                  { color: colors.text },
                ]}
              >
                Collectes de la saison
              </Text>
              <StatusBadge {...seasonStatus(current)} />
            </View>
            <CollectionDestinationLink
              label="FFVB"
              detail="National, régional et départemental"
              icon={Globe}
              onPress={() =>
                router.push(collectionProviderHref(seasonId, "ffvb"))
              }
            />
            <CollectionDestinationLink
              label="LNV"
              detail="Les trois championnats professionnels"
              icon={Trophy}
              onPress={() =>
                router.push(collectionProviderHref(seasonId, "lnv"))
              }
            />
            {preparing && (
              <Button
                label={seasonCommands.closure.label}
                variant="secondary"
                onPress={() => confirm("closure")}
              />
            )}
          </PageContent>
        </PageScrollView>
      ) : (
        <PageReadState pending={pending}>
          {authority.enabled ? (
            <ReadFeedback
              query={season}
              loadingContent={<CollectionLoading />}
            />
          ) : (
            <AccessFeedback
              {...authority}
              loadingContent={<CollectionLoading />}
            />
          )}
        </PageReadState>
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  heading: {
    alignItems: "center",
    flexDirection: "row",
    gap: tokens.spacing.sm,
    justifyContent: "space-between",
  },
  headingText: { flexShrink: 1 },
});
