import { ApiError } from "../../../shared/api/api-fetch";
import { tokens } from "../../../shared/theme/tokens";
import { Controller } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import type { CollectionProviderEnum } from "../../../../.generated/schemas/index.zod";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { TextField } from "../../../shared/components/text-field";
import type { useSeasonPreparation } from "../api/use-source-preparation";
import { type CreateSourceValues } from "../schemas/create-source-schema";
import type { useProviderPreparationDraft } from "./use-provider-preparation-draft";
import { createSourceValues } from "./create-source-values";

/** Shares the provider's original season revision and its explicit local cancellation owner. */
export interface CreateSourceFormProps {
  editor: ReturnType<typeof useProviderPreparationDraft>;
  provider: CollectionProviderEnum;
  editing: ReturnType<typeof useSeasonPreparation>;
  disabled: boolean;
  /** Confirms disposal of the mounted provider draft before closing the inline form. */
  onCancel(): void;
}
/** Validates and submits a supported candidate without qualifying it or launching collection implicitly. */
export function CreateSourceForm({
  editor,
  provider,
  editing,
  disabled,
  onCancel,
}: CreateSourceFormProps) {
  const actionFeedback = useActionFeedback();
  const { baseline } = editor.state;
  const { control, handleSubmit, reset } = editor.form;
  /** Keeps the original scope and input after refusal; acceptance resets only this candidate's fields. */
  async function submit(values: CreateSourceValues) {
    if (disabled) return;
    try {
      const attempt = editing.create.mutateAsync({
        seasonRevision: baseline.revision,
        provider,
        ...values,
      });
      editor.update({ ...editor.state, feedback: undefined });
      actionFeedback.clear();
      await attempt;
      reset(createSourceValues());
      editor.update({
        ...editor.state,
        adding: false,
        feedback: "Source ajoutée. Relisez l’état avant une nouvelle action.",
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        editor.update({
          ...editor.state,
          feedback: "Le résultat doit être vérifié avant une nouvelle action.",
        });
      } else {
        editor.update({ ...editor.state, feedback: undefined });
        actionFeedback.error();
      }
    }
  }
  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="organizerReference"
        render={({ field, fieldState }) => (
          <TextField
            ref={field.ref}
            label="Référence de l’organisateur ou du championnat"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!disabled}
            error={fieldState.error?.message}
            helper="La référence officielle attendue sera vérifiée par le collecteur."
          />
        )}
      />
      <Controller
        control={control}
        name="candidateUrl"
        render={({ field, fieldState }) => (
          <TextField
            ref={field.ref}
            label="URL officielle"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            editable={!disabled}
            autoCapitalize="none"
            autoCorrect={false}
            inputMode="url"
            error={fieldState.error?.message}
            helper="URL d’un format officiel pris en charge, sans identifiant. Elle ne prouve pas la saison."
          />
        )}
      />
      <Button
        label="Enregistrer"
        fullWidth
        onPress={() => void handleSubmit(submit)()}
        disabled={disabled}
        loading={editing.create.isPending}
      />
      <Button
        label="Annuler"
        variant="secondary"
        fullWidth
        onPress={onCancel}
        disabled={editing.create.isPending}
      />
    </View>
  );
}
const styles = StyleSheet.create({ form: { gap: tokens.layout.form.gap } });
