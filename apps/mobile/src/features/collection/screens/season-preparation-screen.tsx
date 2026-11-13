import { seasonStatus } from "../components/source-summary";
import { PreparationLink } from "../components/preparation-link";
import { AccessFeedback } from "@/features/access/components/access-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { PageHeader } from "@/shared/components/page-header";
import { Page, PageScrollView, PageContent } from "@/shared/components/page";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { useRouter } from "expo-router";
import { Globe, Trophy } from "lucide-react-native";
import { Text } from "react-native";
import { Button } from "@/shared/components/button";
import { CollectionLoading } from "../components/collection-loading";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { useCollectionSeason } from "../api/use-source-preparation";

/** Opens seasonal controls, source preparation and definitive closure after current admission. */
export function SeasonPreparationScreen({
  seasonId,
}: Readonly<{ seasonId: string }>) {
  const { authority, season } = useCollectionSeason(seasonId);
  const router = useRouter();
  const { colors } = useTheme();
  const pending = !authority.enabled
    ? authority.sessionStatus === "restoring" ||
      (authority.sessionStatus === "authenticated" &&
        authority.account.isLoading)
    : !hasReadError(season) && season.isLoading;
  const FeedbackLayout = pending ? PageContent : ScreenState;

  /** Admits season content only after current permission and a usable read. */
  function renderBlockingState() {
    if (!authority.enabled) {
      return (
        <AccessFeedback {...authority} loadingContent={<CollectionLoading />} />
      );
    }
    if (!season.data || hasReadError(season)) {
      return (
        <ReadFeedback query={season} loadingContent={<CollectionLoading />} />
      );
    }
    return undefined;
  }

  const blockingState = renderBlockingState();
  return (
    <Page header={<PageHeader title={season.data?.label ?? "Saison"} />}>
      <PageScrollView
        refreshControl={
          authority.sessionStatus === "authenticated" && !blockingState ? (
            <DataRefreshControl
              fetching={season.isFetching}
              onRefresh={() => season.refetch({ cancelRefetch: false })}
            />
          ) : undefined
        }
      >
        {blockingState ? (
          <FeedbackLayout>{blockingState}</FeedbackLayout>
        ) : (
          <PageContent>
            {authority.enabled && season.data && (
              <>
                <Text
                  style={[tokens.typography.strong, { color: colors.text }]}
                >
                  Collectes de la saison · {seasonStatus(season.data)}
                </Text>
                <PreparationLink
                  label="FFVB"
                  detail="National, régional et départemental"
                  icon={Globe}
                  onPress={() =>
                    router.push({
                      pathname: "/collection/[seasonId]/controls/[provider]",
                      params: { seasonId, provider: "ffvb" },
                    })
                  }
                />
                <PreparationLink
                  label="LNV"
                  detail="Les trois championnats professionnels"
                  icon={Trophy}
                  onPress={() =>
                    router.push({
                      pathname: "/collection/[seasonId]/controls/[provider]",
                      params: { seasonId, provider: "lnv" },
                    })
                  }
                />
                {season.data.state !== "closed" && (
                  <Button
                    label="Clôturer la saison"
                    variant="secondary"
                    onPress={() =>
                      router.push({
                        pathname: "/collection/[seasonId]/closure",
                        params: { seasonId },
                      })
                    }
                  />
                )}
              </>
            )}
          </PageContent>
        )}
      </PageScrollView>
    </Page>
  );
}
