import { seasonStatus } from "../components/source-summary";
import { PreparationLink } from "../components/preparation-link";
import { AccessFeedback } from "../../access/components/access-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { PageHeader } from "../../../shared/components/page-header";
import {
  Page,
  PageScrollView,
  PageContent,
} from "../../../shared/components/page";
import { ErrorState } from "../../../shared/components/state-card";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { useRouter } from "expo-router";
import { Globe, Trophy } from "lucide-react-native";
import { Text } from "react-native";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { CollectionLoading } from "../components/collection-loading";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { useCollectionSeason } from "../api/use-source-preparation";

/** Opens seasonal controls, source preparation and definitive closure after current admission. */
export function SeasonPreparationScreen({ seasonId }: { seasonId: string }) {
  const { authority, season } = useCollectionSeason(seasonId);
  const router = useRouter();
  const { colors } = useTheme();
  const feedback = useActionFeedback();

  /** Refreshes this admitted season, retaining authorized content after a technical failure. */
  async function refresh() {
    const result = await season.refetch({ cancelRefetch: false });
    if (result.isError && result.data && !isAccessDenied(result.error)) {
      feedback.error();
    }
  }

  const pending = !authority.enabled
    ? authority.sessionStatus === "restoring" ||
      (authority.sessionStatus === "authenticated" &&
        authority.account.isLoading)
    : !season.data && season.isLoading;
  const FeedbackLayout = pending ? PageContent : ScreenState;
  const blockingState = !authority.enabled ? (
    <AccessFeedback {...authority} loadingContent={<CollectionLoading />} />
  ) : isAccessDenied(season.error) ? (
    <ErrorState
      onRetry={() => void season.refetch()}
      retrying={season.isFetching}
    />
  ) : !season.data ? (
    season.isError ? (
      <ErrorState
        onRetry={() => void season.refetch()}
        retrying={season.isFetching}
      />
    ) : (
      <ReadFeedback query={season} loadingContent={<CollectionLoading />} />
    )
  ) : undefined;
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
                    disabled={season.isError || season.isFetching}
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
