import { seasonStatus } from "../components/source-summary";
import { PreparationLink } from "../components/preparation-link";
import { AccessFeedback } from "@/features/access/components/access-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { PageHeader } from "@/shared/components/page-header";
import { Page, PageScrollView, PageContent } from "@/shared/components/page";
import { ErrorState } from "@/shared/components/state-card";
import { ReadFeedback } from "@/shared/components/read-feedback";
import { useRouter } from "expo-router";
import { Globe, Trophy } from "lucide-react-native";
import { Text } from "react-native";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { Button } from "@/shared/components/button";
import { CollectionLoading } from "../components/collection-loading";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { useCollectionSeason } from "../api/use-source-preparation";
import { isCollectionReadRefused } from "../api/collection-queries";

/** Opens seasonal controls, source preparation and definitive closure after current admission. */
export function SeasonPreparationScreen({
  seasonId,
}: Readonly<{ seasonId: string }>) {
  const { authority, season } = useCollectionSeason(seasonId);
  const router = useRouter();
  const { colors } = useTheme();
  const feedback = useActionFeedback();

  /** Refreshes this admitted season, retaining authorized content after a technical failure. */
  async function refresh() {
    const result = await season.refetch({ cancelRefetch: false });
    if (
      result.isError &&
      result.data &&
      !isCollectionReadRefused(result.error)
    ) {
      feedback.error();
    }
  }

  const pending = !authority.enabled
    ? authority.sessionStatus === "restoring" ||
      (authority.sessionStatus === "authenticated" &&
        authority.account.isLoading)
    : !season.data && season.isLoading;
  const FeedbackLayout = pending ? PageContent : ScreenState;

  /** Admits season content only after current permission and a usable read. */
  function renderBlockingState() {
    if (!authority.enabled) {
      return (
        <AccessFeedback {...authority} loadingContent={<CollectionLoading />} />
      );
    }
    if (isCollectionReadRefused(season.error)) {
      return (
        <ErrorState
          onRetry={() => void season.refetch()}
          retrying={season.isFetching}
        />
      );
    }
    if (!season.data) {
      if (season.isError) {
        return (
          <ErrorState
            onRetry={() => void season.refetch()}
            retrying={season.isFetching}
          />
        );
      }
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
            <DataRefreshControl onRefresh={refresh} />
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
                    disabled={isCollectionReadRefused(season.error)}
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
