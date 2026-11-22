import { useNavigation, useRouter } from "expo-router";
import { Controller, useFormState, type UseFormReturn } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import {
  SportFormatEnum,
  SportGenderEnum,
} from "../../../../.generated/schemas/index.zod";
import {
  formatLabel,
  sportingGenderLabels,
} from "@/features/sporting/classification-presentation";
import { ApiError } from "@/shared/api/api-fetch";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { Button } from "@/shared/components/button";
import { FieldMessage } from "@/shared/components/field-message";
import { ReloadButton } from "@/shared/components/reload-button";
import { SelectField } from "@/shared/components/select-field";
import { SelectionList } from "@/shared/components/selection-list";
import { EmptyState } from "@/shared/components/state-card";
import { useDiscardChanges } from "@/shared/forms/use-discard-changes";
import { tokens } from "@/shared/theme/tokens";
import {
  type useDivisions,
  type ClassificationTarget,
  type useClassification,
} from "../api/classification";
import { toClassificationRequest } from "../api/classification-request";
import type { ClassificationValues } from "../schemas/classification-schema";
import { classificationValues } from "./classification-values";

export const classificationFieldLabels = {
  divisionId: "Division",
  format: "Format",
  gender: "Genre",
};

export type ClassificationField = keyof typeof classificationFieldLabels;

const classificationFields = Object.keys(
  classificationFieldLabels,
) as ClassificationField[];
const poolModes = [
  { custom: false, label: "Du pack" },
  { custom: true, label: "Personnalisé" },
];
const formats = SportFormatEnum.options.map((value) => ({
  value,
  label: formatLabel(value),
}));
const genders = SportGenderEnum.options.map((value) => ({
  value,
  label: sportingGenderLabels[value],
}));

export function ClassificationForm({
  kind,
  form,
  custom,
  disabled,
  save,
  divisionQuery,
  choice,
  onChoice,
}: Readonly<{
  kind: ClassificationTarget["kind"];
  form: UseFormReturn<ClassificationValues>;
  custom: boolean;
  disabled: boolean;
  save: ReturnType<typeof useClassification>["save"];
  divisionQuery: ReturnType<typeof useDivisions>["query"];
  choice?: ClassificationField;
  onChoice: (field?: ClassificationField) => void;
}>) {
  const router = useRouter();
  const navigation = useNavigation();
  const feedback = useActionFeedback({ retainSuccessOnUnmount: true });
  const { control, getValues, handleSubmit, reset, setError, setValue } = form;
  const { isDirty, errors } = useFormState({ control });
  const disablePrevention = useDiscardChanges(!choice && isDirty, () =>
    reset(),
  );
  const busy = disabled || save.isPending;
  const choicesBusy =
    busy || !divisionQuery.isSuccess || divisionQuery.isFetching;
  const divisions = divisionQuery.data?.items ?? [];
  const options = {
    divisionId: divisions.flatMap(({ id, name, active }) =>
      active ? [{ value: id, label: name }] : [],
    ),
    format: formats,
    gender: genders,
  };

  function submit(draft: ClassificationValues) {
    if (draft.custom ? choicesBusy : busy) {
      return;
    }
    if (
      draft.custom &&
      !options.divisionId.some(({ value }) => value === draft.divisionId)
    ) {
      setError("divisionId", {
        message: "Choisissez une division active disponible.",
      });
      return;
    }
    feedback.clear();
    save.mutate(toClassificationRequest(draft), {
      onSuccess(accepted) {
        if (!navigation.isFocused()) {
          return;
        }
        // Reset the acknowledged draft and release its guard before closing this sheet.
        reset(classificationValues(accepted, kind));
        disablePrevention();
        feedback.success(
          kind === "pack"
            ? "Classification du pack enregistrée"
            : "Classification de la poule enregistrée",
        );
        router.back();
      },
      onError: showWriteFailure,
    });
  }

  function showWriteFailure(error: Error) {
    if (
      error instanceof ApiError &&
      error.status === 409 &&
      error.problem?.type === "urn:blockout:problem:classification-conflict"
    ) {
      const ids =
        "conflictingResourceIds" in error.problem
          ? error.problem.conflictingResourceIds
          : undefined;
      const scopes =
        Array.isArray(ids) && ids.length > 0
          ? ` Périmètres en conflit : ${ids.join(", ")}.`
          : "";
      setError("root.conflict", {
        message: `Correction entièrement refusée : division inactive, participations partagées ou identité d’équipe incompatible. Réduisez le périmètre ou demandez une intervention technique.${scopes} Votre brouillon est conservé.`,
      });
    } else {
      feedback.error();
    }
  }

  if (choice) {
    return options[choice].length > 0 ? (
      <SelectionList
        options={options[choice]}
        selected={getValues(choice)}
        onSelect={(value) => {
          setValue(choice, value, {
            shouldDirty: true,
            shouldValidate: true,
          });
          onChoice(undefined);
        }}
      />
    ) : (
      <EmptyState title="Aucune division active">
        <ReloadButton
          fetching={divisionQuery.isFetching}
          onReload={() => divisionQuery.refetch()}
        />
      </EmptyState>
    );
  }

  return (
    <View style={styles.form}>
      {kind === "pool" && (
        <Controller
          control={control}
          name="custom"
          render={({ field }) => (
            <View style={styles.modes}>
              {poolModes.map((mode) => {
                const selected = mode.custom === field.value;
                return (
                  <View key={String(mode.custom)} style={styles.mode}>
                    <Button
                      label={mode.label}
                      selected={selected}
                      variant={selected ? "primary" : "secondary"}
                      fullWidth
                      disabled={busy}
                      onPress={() => field.onChange(mode.custom)}
                    />
                  </View>
                );
              })}
            </View>
          )}
        />
      )}
      {custom &&
        classificationFields.map((name) => (
          <Controller
            key={name}
            control={control}
            name={name}
            render={({ field, fieldState }) => (
              <SelectField
                label={classificationFieldLabels[name]}
                value={
                  name === "divisionId"
                    ? divisions.find(({ id }) => id === field.value)?.name
                    : options[name].find(({ value }) => value === field.value)
                        ?.label
                }
                error={fieldState.error?.message}
                helper={
                  name === "divisionId" &&
                  !!field.value &&
                  divisionQuery.isSuccess &&
                  !options.divisionId.some(({ value }) => value === field.value)
                    ? "La division sélectionnée est inactive ou indisponible. Choisissez une division active avant une nouvelle affectation."
                    : undefined
                }
                disabled={choicesBusy}
                onPress={() => onChoice(name)}
              />
            )}
          />
        ))}
      <FieldMessage error={errors.root?.conflict?.message} />
      <Button
        label="Enregistrer"
        fullWidth
        disabled={custom ? choicesBusy : busy}
        loading={save.isPending}
        onPress={() => void handleSubmit(submit)()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: tokens.layout.form.gap },
  modes: { flexDirection: "row", gap: tokens.spacing.sm },
  mode: { flex: 1, minWidth: 0 },
});
