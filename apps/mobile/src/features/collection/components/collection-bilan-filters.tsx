import { useQuery } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import type {
  CollectionProviderEnum,
  CollectionStageEnum,
} from "../../../../.generated/schemas/index.zod";
import { AccessFeedback } from "@/features/access/components/access-feedback";
import { Button } from "@/shared/components/button";
import { EntryGroup } from "@/shared/components/entry-group";
import { ListLoading } from "@/shared/components/list-loading";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { SelectField } from "@/shared/components/select-field";
import { SelectionRow } from "@/shared/components/selection-row";
import { Sheet, SheetContent } from "@/shared/components/sheet";
import { tokens } from "@/shared/theme/tokens";
import {
  createCollectionQueries,
  type CollectionResultCriteria,
} from "../api/collection-queries";
import { useCollectionAuthority } from "../api/use-source-preparation";
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

export interface CollectionBilanFiltersProps {
  seasonId: string;
  provider: CollectionProviderEnum;
  initial: CollectionResultCriteria;
  onApply: (criteria: CollectionResultCriteria) => void;
  onClose: () => void;
}

/** The sheet owns its unapplied values. Source choices come from the current provider's retained bindings. */
export function CollectionBilanFilters({
  seasonId,
  provider,
  initial,
  onApply,
  onClose,
}: Readonly<CollectionBilanFiltersProps>) {
  const authority = useCollectionAuthority();
  const [choice, setChoice] = useState<keyof FilterDraft>();
  const { control, handleSubmit, reset, setValue } = useForm<FilterDraft>({
    defaultValues: {
      status: initial.status,
      sourceId: initial.sourceId,
      stage: initial.stage,
    },
  });
  const draft = useWatch({ control });
  const sources = useQuery({
    ...createCollectionQueries(authority).sources(seasonId),
    enabled: authority.enabled && (choice === "sourceId" || !!draft.sourceId),
  });
  const sourceChoices =
    sources.data?.items.filter((source) => source.provider === provider) ?? [];
  const fields = {
    status: {
      label: "Statut",
      all: "Tous les statuts",
      options: Object.entries(outcomeLabels).map(([value, label]) => ({
        value,
        label,
      })),
    },
    sourceId: {
      label: "Source",
      all: "Toutes les sources",
      options: sourceChoices.map(({ id, label }) => ({ value: id, label })),
    },
    stage: {
      label: "Étape",
      all: "Toutes les étapes",
      options: seasonStages.map((value) => ({
        value,
        label: stageLabels[value],
      })),
    },
  };
  const loading = <ListLoading label="Chargement des sources" />;

  function renderContent() {
    if (!authority.enabled) {
      return <AccessFeedback {...authority} loadingContent={loading} />;
    }
    if (!choice) {
      return (
        <View style={styles.form}>
          <SelectField
            label={fields.status.label}
            value={
              draft.status ? outcomeLabels[draft.status] : fields.status.all
            }
            onPress={() => setChoice("status")}
          />
          <SelectField
            label={fields.sourceId.label}
            value={
              draft.sourceId
                ? (sourceChoices.find((source) => source.id === draft.sourceId)
                    ?.label ?? "Source sélectionnée")
                : fields.sourceId.all
            }
            onPress={() => setChoice("sourceId")}
          />
          <SelectField
            label={fields.stage.label}
            value={draft.stage ? stageLabels[draft.stage] : fields.stage.all}
            onPress={() => setChoice("stage")}
          />
          <View style={styles.actions}>
            <Button
              label="Appliquer les filtres"
              fullWidth
              onPress={() =>
                void handleSubmit((filters) =>
                  onApply({ ...filters, query: initial.query }),
                )()
              }
            />
            <Button
              label="Réinitialiser les filtres"
              variant="secondary"
              fullWidth
              onPress={() =>
                reset({
                  status: undefined,
                  sourceId: undefined,
                  stage: undefined,
                })
              }
            />
          </View>
        </View>
      );
    }
    if (choice === "sourceId" && (!sources.data || hasReadError(sources))) {
      return <ReadFeedback query={sources} loadingContent={loading} />;
    }
    const field = fields[choice];
    const options = [{ value: undefined, label: field.all }, ...field.options];
    return (
      <EntryGroup>
        {options.map(({ value, label }) => (
          <SelectionRow
            key={value ?? "all"}
            label={label}
            selected={draft[choice] === value}
            onPress={() => {
              setValue(choice, value);
              setChoice(undefined);
            }}
          />
        ))}
      </EntryGroup>
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

const styles = StyleSheet.create({
  form: { gap: tokens.layout.form.gap },
  actions: { gap: tokens.layout.actions.gap },
});
