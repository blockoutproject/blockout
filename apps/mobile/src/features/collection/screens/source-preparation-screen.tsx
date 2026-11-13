import { useState } from "react";
import { StyleSheet } from "react-native";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { FormScrollView } from "@/shared/components/form-scroll-view";
import { Page, PageContent } from "@/shared/components/page";
import { PageHeader } from "@/shared/components/page-header";
import { ScreenState } from "@/shared/components/screen-state";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { AccessFeedback } from "@/features/access/components/access-feedback";
import type {
  CollectionSeasonResponse,
  SourceBindingResponse,
} from "../../../../.generated/schemas/index.zod";
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
  const visitKey = `${authority.session.subject}:${seasonId}:${sourceId}`;
  const [snapshot, setSnapshot] = useState<
    | {
        key: string;
        source: SourceBindingResponse;
        season: CollectionSeasonResponse;
      }
    | undefined
  >();
  const seed = snapshot?.key === visitKey ? snapshot : undefined;
  if (!seed && source.data?.seasonId === seasonId && season.data) {
    // This initial snapshot only seeds the form visit; it never follows background projections.
    setSnapshot({ key: visitKey, source: source.data, season: season.data });
  }
  const mismatch = Boolean(source.data && source.data.seasonId !== seasonId);
  const requiredRead = mismatch
    ? source
    : ([season, source].find(hasReadError) ?? (!season.data ? season : source));
  const blocked =
    !authority.enabled ||
    !source.data ||
    !season.data ||
    mismatch ||
    hasReadError(source) ||
    hasReadError(season);
  const pending = !authority.enabled
    ? authority.sessionStatus === "restoring" ||
      (authority.sessionStatus === "authenticated" &&
        authority.account.isLoading)
    : !hasReadError(requiredRead) &&
      !mismatch &&
      (source.isLoading || season.isLoading);
  const FeedbackLayout = pending ? PageContent : ScreenState;

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
          {seed && (
            <SourceCandidateForm
              key={visitKey}
              source={seed.source}
              season={seed.season}
              editing={editing}
            />
          )}
        </PageContent>
      </FormScrollView>
    </Page>
  );
}

const styles = StyleSheet.create({ hidden: { display: "none" } });
