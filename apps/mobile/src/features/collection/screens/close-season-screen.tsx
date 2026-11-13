import { StyleSheet } from "react-native";
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
  const visitKey = `${authority.session.subject}:${authority.session.accountId}:${seasonId}`;
  const requiredRead = [authority.account, season].find(hasReadError) ?? season;
  const blocked =
    !authority.enabled || !season.data || hasReadError(requiredRead);
  const initialLoading = !authority.enabled
    ? authority.sessionStatus === "restoring" ||
      (authority.sessionStatus === "authenticated" &&
        authority.account.isLoading &&
        !hasReadError(authority.account))
    : !hasReadError(requiredRead) && season.isLoading;
  const FeedbackLayout = initialLoading ? PageContent : ScreenState;

  // Removing RefreshControl changes React Native’s content ancestry and disposes the mounted draft.
  return (
    <Page header={<PageHeader title="Clôturer la saison" />}>
      <FormScrollView
        refreshControl={
          <DataRefreshControl
            fetching={season.isFetching}
            enabled={!blocked && !editing.close.isPending}
            onRefresh={() => season.refetch({ cancelRefetch: false })}
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
                query={requiredRead}
                loadingContent={<CloseSeasonLoading />}
              />
            )}
          </FeedbackLayout>
        )}
        <PageContent style={blocked ? styles.hidden : undefined}>
          <CloseSeasonForm
            key={visitKey}
            season={season.data}
            editing={editing}
          />
        </PageContent>
      </FormScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({ hidden: { display: "none" } });
