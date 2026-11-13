import { StyleSheet } from "react-native";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { FormScrollView } from "@/shared/components/form-scroll-view";
import { Page, PageContent } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { ScreenState } from "@/shared/components/screen-state";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { AccessFeedback } from "@/features/access/components/access-feedback";
import { SourcePreparationLoading } from "../components/collection-loading";
import { useSourcePreparation } from "../api/use-source-preparation";
import { SourceCandidateForm } from "../forms/source-candidate-form";

/** Original source route inputs; its retained form owns draft-discard confirmation. */
export interface SourcePreparationScreenProps {
  seasonId: string;
  sourceId: string;
}

/** Keeps the route's editable snapshot mounted while current required reads own admission and feedback. */
export function SourcePreparationScreen({
  seasonId,
  sourceId,
}: Readonly<SourcePreparationScreenProps>) {
  const editing = useSourcePreparation(seasonId, sourceId);
  const { authority, source, season } = editing;
  const visitKey = `${authority.session.subject}:${authority.session.accountId}:${seasonId}:${sourceId}`;
  const mismatch = Boolean(source.data && source.data.seasonId !== seasonId);
  const requiredRead = mismatch
    ? source
    : ([authority.account, season, source].find(hasReadError) ??
      (!season.data ? season : source));
  const blocked =
    !authority.enabled ||
    !source.data ||
    !season.data ||
    mismatch ||
    hasReadError(requiredRead);
  const initialLoading = !authority.enabled
    ? authority.sessionStatus === "restoring" ||
      (authority.sessionStatus === "authenticated" &&
        authority.account.isLoading &&
        !hasReadError(authority.account))
    : !hasReadError(requiredRead) &&
      !mismatch &&
      (source.isLoading || season.isLoading);
  const FeedbackLayout = initialLoading ? PageContent : ScreenState;

  // Removing RefreshControl changes React Native’s content ancestry and disposes the mounted draft.
  return (
    <Page header={<PageHeader title={source.data?.label ?? "Source"} />}>
      <FormScrollView
        refreshControl={
          <DataRefreshControl
            fetching={source.isFetching || season.isFetching}
            enabled={!blocked && !editing.candidate.isPending}
            onRefresh={() =>
              Promise.all([
                source.refetch({ cancelRefetch: false }),
                season.refetch({ cancelRefetch: false }),
              ])
            }
          />
        }
      >
        {blocked && (
          <FeedbackLayout>
            {!authority.enabled ? (
              <AccessFeedback
                {...authority}
                loadingContent={<SourcePreparationLoading />}
              />
            ) : (
              <ReadFeedback
                failed={mismatch}
                query={requiredRead}
                loadingContent={<SourcePreparationLoading />}
              />
            )}
          </FeedbackLayout>
        )}
        <PageContent style={blocked ? styles.hidden : undefined}>
          <SourceCandidateForm
            key={visitKey}
            source={
              season.data && source.data?.seasonId === seasonId
                ? source.data
                : null
            }
            season={season.data}
            editing={editing}
          />
        </PageContent>
      </FormScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({ hidden: { display: "none" } });
