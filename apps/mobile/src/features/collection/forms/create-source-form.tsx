import { zodResolver } from "@hookform/resolvers/zod";
import {
  Controller,
  useForm,
  useFormState,
  type UseFormProps,
} from "react-hook-form";
import { View } from "react-native";
import { Button } from "../../../shared/components/button";
import { TextField } from "../../../shared/components/text-field";
import { preparationStyles } from "../components/preparation-layout";
import {
  createSourceSchema,
  type CreateSourceValues,
} from "../schemas/source-candidate";

/** A manual supported candidate; its owner handles outcomes and resets the retained control after acceptance. */
export interface CreateSourceFormProps {
  formControl: UseFormProps<CreateSourceValues>["formControl"];
  disabled: boolean;
  saving: boolean;
  onSubmit: (values: CreateSourceValues) => Promise<void>;
}

/** Keeps the original expected scope and URL after refusal, conflict or uncertain acknowledgement. */
export function CreateSourceForm({
  formControl,
  disabled,
  saving,
  onSubmit,
}: CreateSourceFormProps) {
  const { control, handleSubmit } = useForm<CreateSourceValues>({
    formControl,
    resolver: zodResolver(createSourceSchema),
  });
  const { errors, isSubmitting } = useFormState({ control });
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
        onPress={() => void handleSubmit(onSubmit)()}
        disabled={disabled || saving || isSubmitting}
        loading={saving}
      />
    </View>
  );
}
