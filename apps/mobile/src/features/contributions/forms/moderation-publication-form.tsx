import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { Button } from "../../../shared/components/button";
import { TextField } from "../../../shared/components/text-field";
import { Surface } from "../../../shared/components/surface";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { useActionConfirmation } from "../../../shared/forms/use-action-confirmation";
import { useDiscardChanges } from "../../../shared/forms/use-discard-changes";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import type { useModerationMatch } from "../api/moderation";
import {
  contributionSchema,
  type ContributionValues,
} from "../schemas/contribution-schema";

/** One route-local moderator draft; its initial revision remains coherent across background reads. */
export interface ModerationPublicationFormProps {
  initial: { revision: string; activeUrl?: string };
  canPublish: boolean;
  editing: ReturnType<typeof useModerationMatch>;
  onClose: () => void;
  onSuccess: () => void;
}
/** Publishes/replaces through the canonical moderator endpoint with exact native confirmation. */
export function ModerationPublicationForm({
  initial,
  canPublish,
  editing,
  onClose,
  onSuccess,
}: ModerationPublicationFormProps) {
  const { colors } = useTheme();
  const revision = initial.revision;
  const confirm = useActionConfirmation();
  const feedback = useActionFeedback();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<ContributionValues>({
    resolver: zodResolver(contributionSchema),
    defaultValues: { url: initial.activeUrl ?? "" },
  });
  const confirmDiscard = useDiscardChanges(isDirty, () => reset());
  /** Captures actor/address/revision before presenting one native dialog; no failure replays a write. */
  async function send(values: ContributionValues) {
    const actorAccountId = editing.session.accountId;
    if (
      !actorAccountId ||
      !editing.allowed ||
      !canPublish ||
      editing.publish.isPending
    )
      return;
    const body = { actorAccountId, revision, url: values.url };
    const accepted = await confirm({
      title: initial.activeUrl ? "Remplacer ce lien ?" : "Publier ce lien ?",
      message: initial.activeUrl
        ? `${initial.activeUrl}\n\nNouveau lien : ${values.url}`
        : values.url,
      confirmLabel: "Publier",
    });
    if (!accepted || !mounted.current) return;
    feedback.clear();
    try {
      await editing.publish.mutateAsync(body);
      if (mounted.current) {
        reset({ url: values.url });
        onSuccess();
      }
    } catch {
      if (mounted.current)
        feedback.error(
          "La publication n’a pas pu être confirmée. Votre saisie est conservée.",
        );
    }
  }
  /** Uses F13's existing discard owner before explicitly removing this mounted editor. */
  async function cancel() {
    if ((await confirmDiscard()) && mounted.current) onClose();
  }
  return (
    <Surface>
      <Text
        accessibilityRole="header"
        style={[tokens.typography.heading, { color: colors.text }]}
      >
        {initial.activeUrl ? "Remplacer le lien" : "Publier un lien"}
      </Text>
      <Controller
        control={control}
        name="url"
        render={({ field, fieldState }) => (
          <TextField
            label="Adresse du lien vidéo"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={fieldState.error?.message}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!editing.publish.isPending}
          />
        )}
      />
      <View style={styles.actions}>
        <Button
          label="Publier"
          loading={editing.publish.isPending}
          disabled={!editing.allowed || !canPublish}
          onPress={() => void handleSubmit(send)()}
        />
        <Button
          label="Annuler"
          variant="secondary"
          disabled={editing.publish.isPending}
          onPress={() => void cancel()}
        />
      </View>
    </Surface>
  );
}
const styles = StyleSheet.create({ actions: { gap: tokens.spacing.sm } });
