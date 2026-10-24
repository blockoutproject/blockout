import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";
import { z } from "zod";
import { Button } from "../../../shared/components/button";
import { TextField } from "../../../shared/components/text-field";
import { preparationStyles } from "../components/preparation-layout";
import { createSourceSchema } from "../schemas/source-candidate";

/** Editable scope/reference values differ from transport: the owning provider and season are route context. */
export type CreateSourceValues = z.infer<typeof createSourceSchema>;

/** A manual supported candidate; its owner returns true only after confirmed creation. */
export interface CreateSourceFormProps {
  disabled: boolean;
  saving: boolean;
  onSubmit: (values: CreateSourceValues) => Promise<boolean>;
  onDirtyChange?: (dirty: boolean) => void;
}

/** Keeps the original expected scope and URL after refusal, conflict or uncertain acknowledgement. */
export function CreateSourceForm({
  disabled,
  saving,
  onSubmit,
  onDirtyChange,
}: CreateSourceFormProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<CreateSourceValues>({
    resolver: zodResolver(createSourceSchema),
    defaultValues: { organizerReference: "", candidateUrl: "" },
  });
  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);
  /** Resets only a definitely accepted candidate; all failed values remain editable after reconciliation. */
  async function submit(values: CreateSourceValues) {
    if (await onSubmit(values)) reset();
  }
  return (
    <View style={preparationStyles.form}>
      <Controller
        control={control}
        name="organizerReference"
        render={({ field: { ref, value, onChange, onBlur } }) => (
          <TextField
            ref={ref}
            label="Référence de l’organisateur ou du championnat"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!disabled && !saving}
            error={errors.organizerReference?.message}
            helper="La référence officielle attendue sera vérifiée par le collecteur."
          />
        )}
      />
      <Controller
        control={control}
        name="candidateUrl"
        render={({ field: { ref, value, onChange, onBlur } }) => (
          <TextField
            ref={ref}
            label="URL officielle"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            editable={!disabled && !saving}
            autoCapitalize="none"
            autoCorrect={false}
            inputMode="url"
            error={errors.candidateUrl?.message}
            helper="URL d’un format officiel pris en charge, sans identifiant. Elle ne prouve pas la saison."
          />
        )}
      />
      <Button
        label="Enregistrer la source"
        fullWidth
        onPress={() => void handleSubmit(submit)()}
        disabled={disabled || saving || isSubmitting}
        loading={saving}
      />
    </View>
  );
}
