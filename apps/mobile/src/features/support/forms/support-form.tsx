import { useRef } from "react";
import { Controller, useFormState, useWatch } from "react-hook-form";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import type { SubmitSupportRequest } from "../../../../.generated/schemas/index.zod";
import { TextField } from "../../../shared/components/text-field";
import { SelectField } from "../../../shared/components/select-field";
import { FieldMessage } from "../../../shared/components/field-message";
import { ImageField } from "../../../shared/components/image-field";
import { Button } from "../../../shared/components/button";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { useSupportImages } from "../model/support-images";
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
  onSubmit: (
    request: SubmitSupportRequest,
    images: readonly Blob[],
  ) => Promise<void>;
}

/** Uses shared native controls, current-journey retention and explicit dirty-form abandonment. */
export function SupportForm({ onSubmit }: SupportFormProps) {
  const { form, context } = useSupportVisit();
  const { control, handleSubmit, reset, setValue, getValues } = form;
  const { isSubmitting } = useFormState({ control });
  const kind = useWatch({ control, name: "kind" });
  const router = useRouter();
  const feedback = useActionFeedback();
  const submitting = useRef(false);
  const attachments = useSupportImages(form, () => !submitting.current);
  const unready = attachments.images.some((image) => image.status !== "ready");

  /** Awaits the preparation consumer once, retaining editable input and ordinary feedback on refusal. */
  async function submit(values: SupportValues) {
    feedback.clear();
    try {
      const files: Blob[] = [];
      for (const image of values.images) {
        if (image.status !== "ready" || !image.file)
          throw new Error("Unready support image");
        files.push(image.file);
      }
      const attempt = onSubmit(toSupportRequest(values, context), files);
      attachments.retainUntil(attempt);
      await attempt;
      reset();
    } catch {
      feedback.error();
    }
  }

  /** Serializes native taps before RHF's asynchronous validation can trigger a second send. */
  async function send() {
    if (submitting.current || attachments.selection.isPending() || unready)
      return;
    submitting.current = true;
    try {
      await handleSubmit(submit)();
    } finally {
      submitting.current = false;
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
      <ImageField
        label="Images (facultatif)"
        images={attachments.images}
        selection={attachments.selection}
        onRemove={attachments.remove}
        multiple
        contentFit="contain"
        chooseLabel="Ajouter des images"
        helper="Jusqu’à cinq images PNG ou JPEG, de 5 Mio maximum chacune."
        error={attachments.error}
        disabled={isSubmitting}
      />
      <FieldMessage helper="Évitez les informations personnelles inutiles, mots de passe et justificatifs de paiement. Aucune capture n’est obligatoire." />
      <Button
        label="Envoyer la demande"
        loading={isSubmitting}
        disabled={attachments.selection.pending || unready}
        onPress={() => void send()}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  sections: { gap: tokens.layout.section.gap },
  fields: { gap: tokens.layout.form.gap },
});
