import { useState } from "react";
import { StyleSheet, View } from "react-native";
import type {
  CollectionProviderEnum,
  SourceCatalogStatusEnum,
} from "../../../../.generated/schemas/index.zod";
import { FilterSheetActions } from "@/shared/components/filter-sheet-actions";
import { SelectField } from "@/shared/components/select-field";
import { SelectionList } from "@/shared/components/selection-list";
import { Sheet, SheetContent } from "@/shared/components/sheet";
import { tokens } from "@/shared/theme/tokens";
import {
  sourceCatalogLabels,
  sourceScopes,
  type SourceFilters,
} from "../model/source-catalogue";

const statuses: SourceCatalogStatusEnum[] = [
  "complete",
  "partial",
  "unavailable",
  "not-read",
];

export function SourceFiltersSheet({
  provider,
  initial,
  onApply,
  onClose,
}: Readonly<{
  provider: CollectionProviderEnum;
  initial: SourceFilters;
  onApply: (draft: SourceFilters) => void;
  onClose: () => void;
}>) {
  const [draft, setDraft] = useState(initial);
  const [choice, setChoice] = useState<keyof SourceFilters>();
  const statusLabel = "Tous les statuts";
  const scopeLabel = "Tous les périmètres";

  return (
    <Sheet
      title={
        choice === "status"
          ? "Statut"
          : choice === "scope"
            ? "Périmètre"
            : "Filtres"
      }
      onClose={choice ? () => setChoice(undefined) : onClose}
    >
      <SheetContent>
        {choice === "status" ? (
          <SelectionList
            options={[
              { value: undefined, label: statusLabel },
              ...statuses.map((value) => ({
                value,
                label: sourceCatalogLabels[value],
              })),
            ]}
            selected={draft.status}
            onSelect={(status) => {
              setDraft({ ...draft, status });
              setChoice(undefined);
            }}
          />
        ) : choice === "scope" ? (
          <SelectionList
            options={[{ value: undefined, label: scopeLabel }, ...sourceScopes]}
            selected={draft.scope}
            onSelect={(scope) => {
              setDraft({ ...draft, scope });
              setChoice(undefined);
            }}
          />
        ) : (
          <View style={styles.form}>
            <SelectField
              label="Statut"
              value={
                draft.status ? sourceCatalogLabels[draft.status] : statusLabel
              }
              onPress={() => setChoice("status")}
            />
            {provider === "ffvb" && (
              <SelectField
                label="Périmètre"
                value={
                  sourceScopes.find(({ value }) => value === draft.scope)
                    ?.label ?? scopeLabel
                }
                onPress={() => setChoice("scope")}
              />
            )}
            <FilterSheetActions
              onApply={() => onApply(draft)}
              onReset={() => setDraft({})}
            />
          </View>
        )}
      </SheetContent>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  form: { gap: tokens.layout.form.gap },
});
