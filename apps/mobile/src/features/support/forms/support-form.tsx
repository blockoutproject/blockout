import { Controller, useFormState, useWatch } from "react-hook-form";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { SubmitSupportRequest } from "../../../../.generated/schemas/index.zod";
import { TextField } from "../../../shared/components/text-field";
import { SelectField } from "../../../shared/components/select-field";
import { FieldMessage } from "../../../shared/components/field-message";
import { Button } from "../../../shared/components/button";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { useDiscardChanges } from "../../../shared/forms/use-discard-changes";
import { tokens } from "../../../shared/theme/tokens";
import { toSupportRequest } from "../api/support-request";
import {
  supportKindLabels,
  supportSubjectLabels,
} from "../model/support-presentation";
import type { SupportValues } from "../schemas/support-schema";
import { useSupportVisit } from "./support-visit";

/** A validated preparation boundary; only the complete-send owner may subsequently confirm receipt. */
export interface SupportFormProps {
  onSubmit: (request: SubmitSupportRequest) => Promise<void>;
}

/** Uses shared native controls, current-journey retention and explicit dirty-form abandonment. */
export function SupportForm({ onSubmit }: SupportFormProps) {
  const { form, context } = useSupportVisit();
  const { control, handleSubmit, reset, setValue, getValues } = form;
  const { isDirty, isSubmitting } = useFormState({ control });
  const kind = useWatch({ control, name: "kind" });
  const router = useRouter();
  const feedback = useActionFeedback();
  useDiscardChanges(isDirty, () => reset());

  /** Awaits the preparation consumer once, retaining editable input and ordinary feedback on refusal. */
  async function submit(values: SupportValues) {
    feedback.clear();
    try {
      await onSubmit(toSupportRequest(values, context));
    } catch {
      feedback.error();
    }
  }

  return (
    <View style={styles.sections}>
      <View style={styles.fields}>
        <Controller
          control={control}
          name="kind"
          render={({ field }) => (
            <SelectField
              label="Nature de la demande"
              value={supportKindLabels[field.value]}
              disabled={isSubmitting}
              onPress={() =>
                router.push({
                  pathname: "/support/choice",
                  params: { field: "kind" },
                })
              }
            />
          )}
        />
        <Controller
          control={control}
          name="subject"
          render={({ field }) => (
            <SelectField
              label="Sujet (facultatif)"
              value={supportSubjectLabels[field.value]}
              disabled={isSubmitting}
              onPress={() =>
                router.push({
                  pathname: "/support/choice",
                  params: { field: "subject" },
                })
              }
            />
          )}
        />
        <Controller
          control={control}
          name="title"
          render={({ field, fieldState }) => (
            <TextField
              ref={field.ref}
              label="Titre"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              editable={!isSubmitting}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field, fieldState }) => (
            <TextField
              ref={field.ref}
              label="Description"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              editable={!isSubmitting}
              multiline
              helper={
                kind === "suggestion"
                  ? "Décrivez votre besoin et l’amélioration souhaitée."
                  : "Décrivez ce qui s’est passé, ou votre besoin et l’amélioration souhaitée."
              }
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="replyEmail"
          render={({ field, fieldState }) => (
            <TextField
              ref={field.ref}
              label="E-mail de réponse"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              onFocus={() =>
                setValue("replyEmail", getValues("replyEmail"), {
                  shouldTouch: true,
                })
              }
              editable={!isSubmitting}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              autoComplete="email"
              helper="Utilisé pour traiter votre demande et vous répondre."
              error={fieldState.error?.message}
            />
          )}
        />
      </View>
      <FieldMessage helper="N’ajoutez pas de mot de passe, de code de connexion ou de justificatif de paiement." />
      <Button
        label="Envoyer la demande"
        loading={isSubmitting}
        onPress={() => void handleSubmit(submit)()}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  sections: { gap: tokens.layout.section.gap },
  fields: { gap: tokens.layout.form.gap },
});
