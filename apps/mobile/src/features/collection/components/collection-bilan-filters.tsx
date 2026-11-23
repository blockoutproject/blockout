import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import type {
  CollectionProviderEnum,
  CollectionStageEnum,
} from "../../../../.generated/schemas/index.zod";
import { AccessFeedback } from "@/features/access/components/access-feedback";
import { FilterSheetForm } from "@/shared/components/filter-sheet-form";
import { ListLoading } from "@/shared/components/list-loading";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { SelectField } from "@/shared/components/select-field";
import { SelectionList } from "@/shared/components/selection-list";
import { Sheet, SheetContent } from "@/shared/components/sheet";
import {
  createCollectionQueries,
  type CollectionResultCriteria,
} from "../api/collection-queries";
import { useCollectionAuthority } from "../api/use-collection-season";
import {
  outcomeLabels,
  stageLabels,
} from "../model/collection-result-presentation";

type FilterDraft = Omit<CollectionResultCriteria, "query">;

const seasonStages: readonly CollectionStageEnum[] = [
  "discovery",
  "calendar",
  "details",
  "standings",
  "logo",
];
const stageOptions = seasonStages.map((value) => ({
  value,
  label: stageLabels[value],
}));
const statusOptions = Object.entries(outcomeLabels).map(([value, label]) => ({
  value,
  label,
}));

export interface CollectionBilanFiltersProps {
  competition?: Readonly<{
    seasonId: string;
    provider: CollectionProviderEnum;
  }>;
  initial: CollectionResultCriteria;
  onApply: (criteria: CollectionResultCriteria) => void;
  onClose: () => void;
}

/** The sheet owns its unapplied values. Source choices come from the current provider's retained bindings. */
export function CollectionBilanFilters({
  competition,
  initial,
  onApply,
  onClose,
}: Readonly<CollectionBilanFiltersProps>) {
  const authority = useCollectionAuthority();
  const [choice, setChoice] = useState<keyof FilterDraft>();
  const [draft, setDraft] = useState<FilterDraft>({
    status: initial.status,
    ...(competition && { sourceId: initial.sourceId, stage: initial.stage }),
  });
  const queries = competition
    ? [
        {
          ...createCollectionQueries(authority).sources(competition.seasonId),
          enabled:
            authority.enabled && (choice === "sourceId" || !!draft.sourceId),
        },
      ]
    : [];
  const [sources] = useQueries({ queries });
  const sourceChoices =
    sources?.data?.items.filter(
      (source) => source.provider === competition?.provider,
    ) ?? [];
  const fields = {
    status: {
      label: "Statut",
      all: "Tous les statuts",
      options: statusOptions,
    },
    sourceId: {
      label: "Source",
      all: "Toutes les sources",
      options: sourceChoices.map(({ id, label }) => ({ value: id, label })),
    },
    stage: {
      label: "Étape",
      all: "Toutes les étapes",
      options: stageOptions,
    },
  };
  const loading = (
    <ListLoading
      label={competition ? "Chargement des sources" : "Chargement des filtres"}
    />
  );

  function renderContent() {
    if (!authority.enabled) {
      return <AccessFeedback {...authority} loadingContent={loading} />;
    }
    if (!choice) {
      return (
        <FilterSheetForm
          onApply={() => onApply({ ...draft, query: initial.query })}
          onReset={() => setDraft({})}
        >
          <SelectField
            label={fields.status.label}
            value={
              draft.status ? outcomeLabels[draft.status] : fields.status.all
            }
            onPress={() => setChoice("status")}
          />
          {competition && (
            <>
              <SelectField
                label={fields.sourceId.label}
                value={
                  draft.sourceId
                    ? (sourceChoices.find(
                        (source) => source.id === draft.sourceId,
                      )?.label ?? "Source sélectionnée")
                    : fields.sourceId.all
                }
                onPress={() => setChoice("sourceId")}
              />
              <SelectField
                label={fields.stage.label}
                value={
                  draft.stage ? stageLabels[draft.stage] : fields.stage.all
                }
                onPress={() => setChoice("stage")}
              />
            </>
          )}
        </FilterSheetForm>
      );
    }
    if (
      choice === "sourceId" &&
      sources &&
      (!sources.data || hasReadError(sources))
    ) {
      return <ReadFeedback query={sources} loadingContent={loading} />;
    }
    const field = fields[choice];
    return (
      <SelectionList
        options={[{ value: undefined, label: field.all }, ...field.options]}
        selected={draft[choice]}
        onSelect={(value) => {
          setDraft((current) => ({ ...current, [choice]: value }));
          setChoice(undefined);
        }}
      />
    );
  }

  return (
    <Sheet
      title={choice ? fields[choice].label : "Filtres"}
      onClose={choice ? () => setChoice(undefined) : onClose}
    >
      <SheetContent>{renderContent()}</SheetContent>
    </Sheet>
  );
}
