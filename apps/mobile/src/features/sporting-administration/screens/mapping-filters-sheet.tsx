import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigation, usePreventRemove, useRouter } from "expo-router";
import { useState } from "react";
import { MappingStatusEnum } from "../../../../.generated/schemas/index.zod";
import { AccessFeedback } from "@/features/access/components/access-feedback";
import { FilterSheetForm } from "@/shared/components/filter-sheet-form";
import { ListContinuation } from "@/shared/components/list-continuation";
import { ListLoading } from "@/shared/components/list-loading";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { SelectField } from "@/shared/components/select-field";
import { SelectionList } from "@/shared/components/selection-list";
import { Sheet, SheetContent } from "@/shared/components/sheet";
import { useSportingAuthority } from "../api/classification";
import {
  createMappingQueries,
  uniqueMappingItems,
} from "../api/mapping-queries";
import { mappingStatusLabels } from "../components/mapping-row";
import {
  type MappingFilters,
  useMappingRouteParams,
} from "../model/mapping-route-params";

const allStatuses = "Tous les statuts";
const allSources = "Toutes les sources";
const allSeasons = "Toutes les saisons";
const loading = <ListLoading label="Chargement des choix" />;

const choiceTitles = { status: "Statut", source: "Source", season: "Saison" };

export function MappingFiltersSheet() {
  const router = useRouter();
  const navigation = useNavigation();
  const { filters, search } = useMappingRouteParams();
  const [draft, setDraft] = useState<MappingFilters>(filters);
  const [choice, setChoice] = useState<keyof typeof choiceTitles>();
  const authority = useSportingAuthority("classification");
  usePreventRemove(authority.enabled && !!choice, () => setChoice(undefined));
  const queries = createMappingQueries(authority);
  const needsSeasons = choice === "season" || (!choice && !draft.seasonId);
  const seasons = useInfiniteQuery(queries.filters("season", needsSeasons));
  const sources = useInfiniteQuery(
    queries.filters("source", choice === "source"),
  );
  const latest = seasons.data?.pages[0]?.items[0];
  const selectedSeason = draft.seasonId ?? latest?.id;

  function apply() {
    router.dismissTo({
      pathname: "/administration/mapping",
      params: { ...draft, search },
    });
  }

  const required = choice === "source" ? sources : seasons;
  const continuationFailed = !!required.data && required.isFetchNextPageError;
  const remoteChoice = choice === "source" || choice === "season";
  const needsOptions = remoteChoice || needsSeasons;
  const choices =
    remoteChoice && required.data
      ? uniqueMappingItems(required.data.pages)
      : [];

  function loadMore() {
    if (
      navigation.isFocused() &&
      required.hasNextPage &&
      !required.isFetching
    ) {
      void required.fetchNextPage({ cancelRefetch: false });
    }
  }

  return (
    <Sheet
      title={choice ? choiceTitles[choice] : "Filtres"}
      onClose={choice ? () => setChoice(undefined) : () => router.back()}
      onScroll={
        authority.enabled &&
        remoteChoice &&
        required.data &&
        !hasReadError(required)
          ? ({
              nativeEvent: { contentOffset, contentSize, layoutMeasurement },
            }) => {
              if (
                contentSize.height - contentOffset.y <
                layoutMeasurement.height * 1.5
              ) {
                loadMore();
              }
            }
          : undefined
      }
    >
      <SheetContent>
        {!authority.enabled ? (
          <AccessFeedback {...authority} loadingContent={loading} />
        ) : needsOptions &&
          (!required.data ||
            (hasReadError(required) && !continuationFailed)) ? (
          <ReadFeedback
            key={choice ?? "filters"}
            query={required}
            loadingContent={loading}
          />
        ) : choice === "status" ? (
          <SelectionList
            options={[
              { value: undefined, label: allStatuses },
              ...MappingStatusEnum.options.map((value) => ({
                value,
                label: mappingStatusLabels[value],
              })),
            ]}
            selected={draft.status}
            onSelect={(status) => {
              setDraft({ ...draft, status });
              setChoice(undefined);
            }}
          />
        ) : remoteChoice ? (
          <>
            <SelectionList
              options={[
                choice === "source"
                  ? { value: undefined, label: allSources }
                  : { value: "all", label: allSeasons },
                ...choices.map(({ id, label }) => ({ value: id, label })),
              ]}
              selected={choice === "source" ? draft.sourceId : selectedSeason}
              onSelect={(value) => {
                const option = choices.find(({ id }) => id === value);
                setDraft(
                  choice === "source"
                    ? {
                        ...draft,
                        sourceId: option?.id,
                        sourceLabel: option?.label,
                      }
                    : {
                        ...draft,
                        seasonId: value === "all" ? "all" : option?.id,
                        seasonLabel: option?.label,
                      },
                );
                setChoice(undefined);
              }}
            />
            <ListContinuation
              loading={required.isFetchingNextPage}
              failed={continuationFailed}
              onRetry={loadMore}
            />
          </>
        ) : (
          <FilterSheetForm onApply={apply} onReset={() => setDraft({})}>
            <SelectField
              label="Statut"
              value={
                draft.status ? mappingStatusLabels[draft.status] : allStatuses
              }
              onPress={() => setChoice("status")}
            />
            <SelectField
              label="Source"
              value={draft.sourceLabel ?? allSources}
              onPress={() => setChoice("source")}
            />
            <SelectField
              label="Saison"
              value={
                draft.seasonId === "all"
                  ? allSeasons
                  : (draft.seasonLabel ?? latest?.label ?? allSeasons)
              }
              onPress={() => setChoice("season")}
            />
          </FilterSheetForm>
        )}
      </SheetContent>
    </Sheet>
  );
}
