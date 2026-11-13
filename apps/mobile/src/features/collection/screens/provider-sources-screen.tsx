import { useState } from "react";
import { StyleSheet, View } from "react-native";
import type {
  CollectionProviderEnum,
  CollectionSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { FormScrollView } from "@/shared/components/form-scroll-view";
import { Page, PageContent } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { ScreenState } from "@/shared/components/screen-state";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { AccessFeedback } from "@/features/access/components/access-feedback";
import { ProviderPreparationLoading } from "../components/collection-loading";
import { useSeasonPreparation } from "../api/use-source-preparation";
import { ProviderPreparationForm } from "../forms/provider-preparation-form";

/** Selects the season/provider whose current reads admit the retained preparation form. */
export interface ProviderSourcesScreenProps {
  seasonId: string;
  provider: CollectionProviderEnum;
}

/** Keeps source selection and manual input with their native form while required reads recover. */
export function ProviderSourcesScreen({
  seasonId,
  provider,
}: Readonly<ProviderSourcesScreenProps>) {
  const editing = useSeasonPreparation(seasonId);
  const { authority, season, sources } = editing;
  const visitKey = `${authority.session.subject}:${seasonId}:${provider}`;
  const [snapshot, setSnapshot] = useState<
    { key: string; season: CollectionSeasonResponse } | undefined
  >();
  const seed = snapshot?.key === visitKey ? snapshot : undefined;
  if (!seed && season.data && sources.data) {
    // This initial snapshot only seeds the form visit; it never follows background projections.
    setSnapshot({ key: visitKey, season: season.data });
  }
  const failed = hasReadError(season) ? season : sources;
  const blocked =
    !authority.enabled ||
    !season.data ||
    !sources.data ||
    hasReadError(season) ||
    hasReadError(sources);
  const pending = !authority.enabled
    ? authority.sessionStatus === "restoring" ||
      (authority.sessionStatus === "authenticated" &&
        authority.account.isLoading)
    : !hasReadError(failed) && (season.isLoading || sources.isLoading);
  const FeedbackLayout = pending ? PageContent : ScreenState;

  // Removing RefreshControl changes React Native’s content ancestry and disposes the mounted draft.
  return (
    <Page header={<PageHeader title={provider === "lnv" ? "LNV" : "FFVB"} />}>
      <FormScrollView
        refreshControl={
          <DataRefreshControl
            fetching={sources.isFetching || season.isFetching}
            enabled={!blocked && !editing.create.isPending}
            onRefresh={async () => {
              await Promise.all([
                season.refetch({ cancelRefetch: false }),
                sources.refetch({ cancelRefetch: false }),
              ]);
            }}
          />
        }
      >
        {blocked && (
          <FeedbackLayout>
            {!authority.enabled ? (
              <AccessFeedback
                {...authority}
                loadingContent={<ProviderPreparationLoading />}
              />
            ) : (
              <ReadFeedback
                query={
                  hasReadError(failed)
                    ? failed
                    : !season.data
                      ? season
                      : sources
                }
                loadingContent={<ProviderPreparationLoading />}
              />
            )}
          </FeedbackLayout>
        )}
        <PageContent>
          <View style={blocked ? styles.hidden : undefined}>
            {seed && (
              <ProviderPreparationForm
                key={visitKey}
                season={seed.season}
                provider={provider}
                editing={editing}
              />
            )}
          </View>
        </PageContent>
      </FormScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({ hidden: { display: "none" } });
