import { zodResolver } from "@hookform/resolvers/zod";
import { useSyncExternalStore } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";
import type { CollectionProviderEnum } from "../../../../.generated/schemas/index.zod";
import { requiresRevisionRead } from "../../../shared/api/mutation-recovery";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { TextField } from "../../../shared/components/text-field";
import type { useSeasonPreparation } from "../api/use-source-preparation";
import { preparationStyles } from "../components/preparation-layout";
import {
  createSourceSchema,
  type CreateSourceValues,
} from "../schemas/create-source-schema";
import type { ProviderPreparationEditor } from "./provider-preparation-editor";
import { createSourceValues } from "./create-source-values";

/** Shares the provider's original season revision; only accepted creation clears this retained candidate draft. */
export interface CreateSourceFormProps {
  editor: ProviderPreparationEditor;
  provider: CollectionProviderEnum;
  editing: ReturnType<typeof useSeasonPreparation>;
  disabled: boolean;
}

/** Validates and submits a supported candidate without qualifying it or launching collection implicitly. */
export function CreateSourceForm({
  editor,
  provider,
  editing,
  disabled,
}: CreateSourceFormProps) {
  const { session } = editing.authority;
  const actionFeedback = useActionFeedback();
  const { baseline } = useSyncExternalStore(
    editor.subscribe,
    editor.getSnapshot,
  );
  const { control, handleSubmit, reset } = useForm<CreateSourceValues>({
    formControl: editor.form.formControl,
    resolver: zodResolver(createSourceSchema),
  });

  /** Keeps the original scope and input after refusal; acceptance resets only this candidate's fields. */
  async function submit(values: CreateSourceValues) {
    if (disabled || !session.isCurrent(session.generation)) return;
    try {
      const attempt = editing.create.start({
        seasonRevision: baseline.revision,
        provider,
        ...values,
      });
      if (!attempt) return;
      editor.update({ ...editor.getSnapshot(), feedback: undefined });
      actionFeedback.clear();
      await attempt;
      if (!session.isCurrent(session.generation)) return;
      reset(createSourceValues());
      editor.update({
        ...editor.getSnapshot(),
        adding: false,
        feedback: "Source ajoutée. Relisez l’état avant une nouvelle action.",
      });
    } catch (error) {
      if (!session.isCurrent(session.generation)) return;
      if (requiresRevisionRead(error)) {
        editor.update({
          ...editor.getSnapshot(),
          feedback: "Le résultat doit être vérifié avant une nouvelle action.",
        });
      } else {
        editor.update({ ...editor.getSnapshot(), feedback: undefined });
        actionFeedback.error(
          "L’action a été refusée. Votre saisie est conservée.",
        );
      }
    }
  }

  return (
    <View style={preparationStyles.form}>
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
        label="Enregistrer la source"
        fullWidth
        onPress={() => void handleSubmit(submit)()}
        disabled={disabled}
        loading={editing.create.executing}
      />
    </View>
  );
}
