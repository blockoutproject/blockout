import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { ErrorState, EmptyState } from "../../../shared/components/state-card";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { AccessFeedback } from "../../access/components/access-feedback";
import {
  sportingGenderLabels,
  formatLabel,
} from "../../sporting/classification-presentation";
import { useRouter } from "expo-router";
import { useWatch } from "react-hook-form";
import { Sheet, SheetContent } from "../../../shared/components/sheet";
import { EntryGroup } from "../../../shared/components/entry-group";
import { SelectionRow } from "../../../shared/components/selection-row";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { useAccountSession } from "../../accounts/current-account";
import {
  useClassification,
  useDivisions,
  type ClassificationTarget,
} from "../api/classification";
import { findClassificationEditor } from "../forms/classification-editor";

/** A native short sheet edits the parent's existing RHF control; it adds no callback registry or second draft. */
export function ClassificationSelectionScreen({
  target,
  field,
}: {
  target: ClassificationTarget;
  field: "divisionId" | "gender" | "format";
}) {
  const session = useAccountSession();
  const router = useRouter();
  const editor = findClassificationEditor(session.generation, target);
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
}: {
  target: ClassificationTarget;
  editor: NonNullable<ReturnType<typeof findClassificationEditor>>;
  field: "divisionId" | "gender" | "format";
}) {
  const feedback = useActionFeedback();
  const router = useRouter();
  const divisions = useDivisions();
  const classification = useClassification(target);
  const value = useWatch({ control: editor.form.control, name: field });
  // Refused remote choices disappear; static choices and the parent's RHF draft remain available read-only.
  const catalog = isAccessDenied(divisions.query.error)
    ? undefined
    : divisions.query.data;
  const label =
    field === "divisionId"
      ? "Division"
      : field === "gender"
        ? "Genre"
        : "Format";
  const choices =
    field === "divisionId"
      ? (catalog?.items
          .filter((item) => item.active)
          .map((item) => ({ value: item.id, label: item.name })) ?? [])
      : field === "gender"
        ? [
            { value: "female", label: sportingGenderLabels.female },
            { value: "male", label: sportingGenderLabels.male },
            { value: "mixed", label: sportingGenderLabels.mixed },
          ]
        : [
            { value: "6x6", label: formatLabel("6x6") },
            { value: "4x4", label: formatLabel("4x4") },
            { value: "2x2", label: formatLabel("2x2") },
          ];
  const denied =
    (field === "divisionId" && isAccessDenied(divisions.query.error)) ||
    isAccessDenied(classification.query.error);
  const disabled =
    divisions.authority.permissions?.manageSportingClassification !== true ||
    denied ||
    !classification.query.isSuccess;
  return (
    <Sheet
      title={label}
      onClose={() => router.back()}
      refreshControl={
        field === "divisionId" &&
        catalog &&
        (divisions.authority.enabled || choices.length > 0) &&
        divisions.authority.sessionStatus === "authenticated" ? (
          <DataRefreshControl
            refreshing={
              divisions.query.isRefetching ||
              divisions.authority.account.isRefetching
            }
            onRefresh={() => {
              if (divisions.authority.enabled)
                void divisions.query.refetch().then((result) => {
                  if (result.isError && result.data) feedback.error();
                });
              else
                void divisions.authority.account.refetch().then((result) => {
                  if (result.isError && result.data) feedback.error();
                });
            }}
          />
        ) : undefined
      }
    >
      {!divisions.authority.enabled &&
        field === "divisionId" &&
        choices.length === 0 && (
          <SheetContent>
            <AccessFeedback {...divisions.authority} />
          </SheetContent>
        )}
      {divisions.authority.enabled && field === "divisionId" && !catalog && (
        <SheetContent>
          <ReadFeedback query={divisions.query} />
        </SheetContent>
      )}
      {divisions.authority.enabled &&
        field === "divisionId" &&
        catalog &&
        choices.length === 0 && (
          <SheetContent>
            <EmptyState title="Aucune division active" />
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
