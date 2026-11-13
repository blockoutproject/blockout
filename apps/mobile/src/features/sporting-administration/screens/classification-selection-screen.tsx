import { RefreshCw } from "lucide-react-native";
import { useRouter } from "expo-router";
import { type UseFormReturn, useWatch } from "react-hook-form";
import { isAccessDenied } from "@/shared/api/access-denied";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { Button } from "@/shared/components/button";
import { EntryGroup } from "@/shared/components/entry-group";
import { ListLoading } from "@/shared/components/list-loading";
import { ReadFeedback } from "@/shared/components/read-feedback";
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
  const feedback = useActionFeedback();
  const router = useRouter();
  const divisions = useDivisions(field === "divisionId");
  const classification = useClassification(target);
  const value = useWatch({ control: editor.form.control, name: field });
  // Refused remote choices disappear; static choices and the parent's RHF draft remain available read-only.
  const catalog = isAccessDenied(divisions.query.error)
    ? undefined
    : divisions.query.data;
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
  const denied =
    (field === "divisionId" && isAccessDenied(divisions.query.error)) ||
    isAccessDenied(classification.query.error);
  const disabled =
    divisions.authority.permissions?.manageSportingClassification !== true ||
    denied ||
    !classification.query.isSuccess;

  /** Rereads the current remote choice owner while preserving static choices and the parent draft. */
  async function refresh() {
    const result = divisions.authority.enabled
      ? await divisions.query.refetch()
      : await divisions.authority.account.refetch();
    if (result.isError && choices.length > 0) {
      feedback.error();
    }
  }

  return (
    <Sheet
      title={label}
      onClose={() => router.back()}
      refreshControl={
        field === "divisionId" &&
        catalog &&
        choices.length > 0 &&
        divisions.authority.sessionStatus === "authenticated" ? (
          <DataRefreshControl onRefresh={refresh} />
        ) : undefined
      }
    >
      {!divisions.authority.enabled &&
        field === "divisionId" &&
        choices.length === 0 && (
          <SheetContent>
            <AccessFeedback
              {...divisions.authority}
              loadingContent={<ListLoading label="Chargement des divisions" />}
            />
          </SheetContent>
        )}
      {divisions.authority.enabled && field === "divisionId" && !catalog && (
        <SheetContent>
          <ReadFeedback
            query={divisions.query}
            loadingContent={<ListLoading label="Chargement des divisions" />}
          />
        </SheetContent>
      )}
      {divisions.authority.enabled &&
        field === "divisionId" &&
        catalog &&
        choices.length === 0 && (
          <SheetContent>
            {divisions.query.isError ? (
              <ErrorState
                onRetry={() => void refresh()}
                retrying={divisions.query.isFetching}
              />
            ) : (
              <EmptyState title="Aucune division active">
                <Button
                  label="Actualiser"
                  leadingIcon={RefreshCw}
                  onPress={() => void refresh()}
                  loading={divisions.query.isFetching}
                />
              </EmptyState>
            )}
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
    </Sheet>
  );
}
