import { collectionProviderHref } from "../model/collection-hrefs";
import { seasonStatus } from "../components/collection-season-summary";
import { CollectionDestinationLink } from "../components/collection-destination-link";
import {
  AccessFeedback,
  isAccessLoading,
} from "@/features/access/components/access-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { useActionFeedback } from "@/shared/components/action-feedback";
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
import { useActionConfirmation } from "@/shared/forms/use-action-confirmation";
import { useActivateCollectionSeason } from "../api/use-collection-season";

/** Opens provider journeys and owns the selected season's activation entry. */
export function CollectionSeasonScreen({
  seasonId,
}: Readonly<{ seasonId: string }>) {
  const { authority, season, activate } = useActivateCollectionSeason(seasonId);
  const feedback = useActionFeedback();
  const router = useRouter();
  const { colors } = useTheme();
  const pending = !authority.enabled
    ? isAccessLoading(authority)
    : !hasReadError(season) && season.isLoading;
  const FeedbackLayout = pending ? PageContent : ScreenState;

  async function activateSeason() {
    feedback.clear();
    try {
      await activate.mutateAsync();
      feedback.success("Saison activée.");
    } catch {
      feedback.error();
    }
  }

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
                {season.data.state === "preparing" && (
                  <SeasonActivation
                    label={season.data.label}
                    pending={activate.isPending}
                    onConfirm={activateSeason}
                  />
                )}
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

/** Keeps the confirmation tied to the mounted, admitted preparing-season action. */
function SeasonActivation({
  label,
  pending,
  onConfirm,
}: Readonly<{ label: string; pending: boolean; onConfirm(): Promise<void> }>) {
  const confirm = useActionConfirmation();

  async function requestActivation() {
    if (
      await confirm({
        title: "Activer la saison ?",
        message: `Les collectes périodiques des compétitions éligibles de la saison ${label} seront autorisées.`,
        confirmLabel: "Activer",
      })
    ) {
      await onConfirm();
    }
  }

  return (
    <Button
      label="Activer la saison"
      loading={pending}
      onPress={() => void requestActivation()}
    />
  );
}
