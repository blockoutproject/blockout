import { useRouter } from "expo-router";
import { useWatch } from "react-hook-form";
import {
  SupportRequestKindEnum,
  SupportRequestSubjectEnum,
} from "../../../../.generated/schemas/index.zod";
import { Sheet, SheetContent } from "../../../shared/components/sheet";
import { ErrorState } from "../../../shared/components/state-card";
import { EntryGroup } from "../../../shared/components/entry-group";
import { SelectionRow } from "../../../shared/components/selection-row";
import { useSupportVisit } from "../forms/support-visit";
import {
  supportKindLabels,
  supportSubjectLabels,
} from "../model/support-presentation";

/** Untrusted route field; only the form's kind and optional subject have a choice journey. */
export interface SupportChoiceProps {
  field?: unknown;
}

/** Edits the same RHF draft behind the native sheet; closing or selecting never abandons the form. */
export function SupportChoice({ field }: SupportChoiceProps) {
  const { form } = useSupportVisit();
  const values = useWatch({ control: form.control });
  const router = useRouter();
  if (field !== "kind" && field !== "subject")
    return (
      <Sheet title="Assistance" onClose={() => router.back()}>
        <SheetContent>
          <ErrorState />
        </SheetContent>
      </Sheet>
    );
  const choices = Object.entries(
    field === "kind" ? supportKindLabels : supportSubjectLabels,
  );
  return (
    <Sheet
      title={field === "kind" ? "Nature de la demande" : "Sujet (facultatif)"}
      onClose={() => router.back()}
    >
      <SheetContent>
        <EntryGroup>
          {choices.map(([value, label]) => (
            <SelectionRow
              key={value}
              label={label}
              selected={values[field] === value}
              onPress={() => {
                if (field === "kind")
                  form.setValue(field, SupportRequestKindEnum.parse(value), {
                    shouldDirty: true,
                    shouldTouch: true,
                  });
                else
                  form.setValue(
                    field,
                    value === "" ? "" : SupportRequestSubjectEnum.parse(value),
                    { shouldDirty: true, shouldTouch: true },
                  );
                router.back();
              }}
            />
          ))}
        </EntryGroup>
      </SheetContent>
    </Sheet>
  );
}
