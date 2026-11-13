import { RefreshCw } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { type UseFormReturn, useWatch } from "react-hook-form";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { Button } from "@/shared/components/button";
import { EntryGroup } from "@/shared/components/entry-group";
import { ListLoading } from "@/shared/components/list-loading";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { StyleSheet, View } from "react-native";
import { SelectionRow } from "@/shared/components/selection-row";
import { Sheet, SheetContent } from "@/shared/components/sheet";
import { EmptyState, ErrorState } from "@/shared/components/state-card";
import { AccessFeedback } from "@/features/access/components/access-feedback";
import {
  formatLabel,
  sportingGenderLabels,
} from "@/features/sporting/classification-presentation";
import {
  useClassification,
  useDivisions,
  type ClassificationTarget,
} from "../api/classification";
import { useClassificationVisit } from "../forms/classification-visit";
import type { ClassificationValues } from "../schemas/classification-schema";

/** A native short sheet edits the parent's existing RHF control; it adds no callback registry or second draft. */
export function ClassificationSelectionScreen({
  target,
  field,
}: Readonly<{
  target: ClassificationTarget;
  field: "divisionId" | "gender" | "format";
}>) {
  const router = useRouter();
  const visit = useClassificationVisit()?.visit;
  const editor =
    visit?.target.kind === target.kind && visit.target.id === target.id
      ? visit
      : undefined;
  return editor ? (
    <Selection editor={editor} field={field} target={target} />
  ) : (
    <Sheet title="Classification" onClose={() => router.back()}>
      <SheetContent>
        <ErrorState />
      </SheetContent>
    </Sheet>
  );
}

/** Choices preserve the draft but require a successful current classification read and grants before editing. */
function Selection({
  editor,
  field,
  target,
}: Readonly<{
  target: ClassificationTarget;
  editor: {
    form: UseFormReturn<ClassificationValues>;
  };
  field: "divisionId" | "gender" | "format";
}>) {
  const router = useRouter();
  const custom = useWatch({ control: editor.form.control, name: "custom" });
  const [reloadRequested, setReloadRequested] = useState(false);
  const divisions = useDivisions(custom === true);
  const classification = useClassification(target);
  const value = useWatch({ control: editor.form.control, name: field });
  // Selection edits the same parent draft; consumed data failures hide every choice.
  const catalog = divisions.query.data;
  let label;
  if (field === "divisionId") {
    label = "Division";
  } else if (field === "gender") {
    label = "Genre";
  } else {
    label = "Format";
  }
  let choices;
  if (field === "divisionId") {
    choices =
      catalog?.items
        .filter((item) => item.active)
        .map((item) => ({ value: item.id, label: item.name })) ?? [];
  } else if (field === "gender") {
    choices = [
      { value: "female", label: sportingGenderLabels.female },
      { value: "male", label: sportingGenderLabels.male },
      { value: "mixed", label: sportingGenderLabels.mixed },
    ];
  } else {
    choices = [
      { value: "6x6", label: formatLabel("6x6") },
      { value: "4x4", label: formatLabel("4x4") },
      { value: "2x2", label: formatLabel("2x2") },
    ];
  }
  const { authority } = classification;
  const disabled = !authority.enabled || !classification.query.isSuccess;
  const reads = [
    authority.account,
    classification.query,
    ...(custom ? [divisions.query] : []),
  ];
  const requiredRead =
    reads.find(hasReadError) ??
    reads.find((query) => query.isPending) ??
    classification.query;
  const blocked =
    !authority.enabled || requiredRead.isPending || hasReadError(requiredRead);

  /** Pull refresh reuses this visit's existing reads without changing its revision or draft. */
  async function refresh() {
    await Promise.all([
      classification.query.refetch(),
      ...(custom ? [divisions.query.refetch()] : []),
    ]);
  }

  /** Only this explicit empty-card action owns its progress; Query owns the read result. */
  async function reload() {
    if (reloadRequested) {
      return;
    }
    setReloadRequested(true);
    try {
      await divisions.query.refetch();
    } finally {
      setReloadRequested(false);
    }
  }

  return (
    <Sheet
      title={label}
      onClose={() => router.back()}
      refreshControl={
        field === "divisionId" ? (
          <DataRefreshControl
            enabled={!blocked && !!catalog && choices.length > 0}
            fetching={
              classification.query.isFetching ||
              (custom === true && divisions.query.isFetching)
            }
            onRefresh={refresh}
          />
        ) : undefined
      }
    >
      {blocked && (
        <SheetContent>
          {!authority.enabled ? (
            <AccessFeedback
              {...authority}
              loadingContent={<ListLoading label="Chargement des divisions" />}
            />
          ) : (
            <ReadFeedback
              query={requiredRead}
              loadingContent={<ListLoading label="Chargement des divisions" />}
            />
          )}
        </SheetContent>
      )}
      <View
        style={blocked ? styles.hidden : undefined}
        accessibilityElementsHidden={blocked}
        importantForAccessibility={blocked ? "no-hide-descendants" : "auto"}
      >
        {field === "divisionId" && catalog && choices.length === 0 && (
          <SheetContent>
            <EmptyState title="Aucune division active">
              <Button
                label="Actualiser"
                leadingIcon={RefreshCw}
                onPress={() => void reload()}
                loading={reloadRequested && divisions.query.isFetching}
              />
            </EmptyState>
          </SheetContent>
        )}
        {choices.length > 0 && (
          <SheetContent>
            <EntryGroup>
              {choices.map((choice) => (
                <SelectionRow
                  key={choice.value}
                  label={choice.label}
                  selected={choice.value === value}
                  disabled={disabled}
                  onPress={() => {
                    editor.form.setValue(field, choice.value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                    router.back();
                  }}
                />
              ))}
            </EntryGroup>
          </SheetContent>
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({ hidden: { display: "none" } });
