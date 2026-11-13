import { useState } from "react";
import { StyleSheet, View } from "react-native";
import type { CollectionSeasonResponse } from "../../../../.generated/schemas/index.zod";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { FormScrollView } from "@/shared/components/form-scroll-view";
import { Page, PageContent } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { ScreenState } from "@/shared/components/screen-state";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { AccessFeedback } from "@/features/access/components/access-feedback";
import { CloseSeasonLoading } from "../components/collection-loading";
import { useCloseCollectionSeason } from "../api/use-collection-controls";
import { CloseSeasonForm } from "../forms/close-season-form";

/** Retains the typed closure draft with its native form while current season/admission reads recover. */
export function CloseSeasonScreen({
  seasonId,
}: Readonly<{ seasonId: string }>) {
  const editing = useCloseCollectionSeason(seasonId);
  const { authority, season } = editing;
  const visitKey = `${authority.session.subject}:${seasonId}`;
  const [snapshot, setSnapshot] = useState<
    { key: string; season: CollectionSeasonResponse } | undefined
  >();
  const seed = snapshot?.key === visitKey ? snapshot : undefined;
  if (!seed && season.data) {
    // This initial snapshot only seeds the form visit; it never follows background projections.
    setSnapshot({ key: visitKey, season: season.data });
  }
  const blocked = !authority.enabled || !season.data || hasReadError(season);
  const pending = !authority.enabled
    ? authority.sessionStatus === "restoring" ||
      (authority.sessionStatus === "authenticated" &&
        authority.account.isLoading)
    : !hasReadError(season) && season.isLoading;
  const FeedbackLayout = pending ? PageContent : ScreenState;

  // Removing RefreshControl changes React Native’s content ancestry and disposes the mounted draft.
  return (
    <Page header={<PageHeader title="Clôturer la saison" />}>
      <FormScrollView
        refreshControl={
          <DataRefreshControl
            fetching={season.isFetching}
            enabled={!blocked && !editing.close.isPending}
            onRefresh={async () => {
              await season.refetch({ cancelRefetch: false });
            }}
          />
        }
      >
        {blocked && (
          <FeedbackLayout>
            {!authority.enabled ? (
              <AccessFeedback
                {...authority}
                loadingContent={<CloseSeasonLoading />}
              />
            ) : (
              <ReadFeedback
                query={season}
                loadingContent={<CloseSeasonLoading />}
              />
            )}
          </FeedbackLayout>
        )}
        <PageContent>
          <View style={blocked ? styles.hidden : undefined}>
            {seed && (
              <CloseSeasonForm
                key={visitKey}
                season={seed.season}
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
