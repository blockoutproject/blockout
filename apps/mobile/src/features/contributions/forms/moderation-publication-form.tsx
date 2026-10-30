import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef } from "react";
import { Controller, useForm, useFormState } from "react-hook-form";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ModeratedStreamContributionsResponse } from "../../../../.generated/schemas/index.zod";
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
import { contributionValues } from "./contribution-values";

/** The active pager scene retains one ordinary RHF address editor and its original dirty baseline. */
export interface ModerationPublicationFormProps {
  current: ModeratedStreamContributionsResponse;
  editing: ReturnType<typeof useModerationMatch>;
  onWithdraw: () => void;
  onSuccess: () => void;
}
/** Reuses ContributionForm's header withdrawal, address field and full-width replacement composition. */
export function ModerationPublicationForm({
  current,
  editing,
  onWithdraw,
  onSuccess,
}: ModerationPublicationFormProps) {
  const { colors } = useTheme();
  const active = current.activeContribution;
  const baseline = useRef({
    revision: current.revision,
    activeUrl: active?.url,
  });
  const confirm = useActionConfirmation();
  const feedback = useActionFeedback();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const { control, handleSubmit, reset, getFieldState } =
    useForm<ContributionValues>({
      resolver: zodResolver(contributionSchema),
      defaultValues: contributionValues(active?.url),
    });
  const { isDirty } = useFormState({ control });
  useEffect(() => {
    // As in the personal editor, accepted changes update only pristine fields; a dirty draft keeps its baseline.
    if (!getFieldState("url").isDirty) {
      baseline.current = { revision: current.revision, activeUrl: active?.url };
      reset(contributionValues(active?.url));
    }
  }, [current.revision, active?.url, getFieldState, reset]);
  useDiscardChanges(isDirty, () => reset(contributionValues()));
  const busy =
    editing.publish.isPending ||
    editing.change.isPending ||
    editing.reactivate.isPending ||
    editing.query.isFetching;
  const disabled =
    !editing.allowed || !current.canPublish || editing.query.isError;
  /** Captures the coherent draft baseline and original actor before one native confirmation, without retrying writes. */
  async function send(values: ContributionValues) {
    const actorAccountId = editing.session.accountId;
    if (!actorAccountId || busy || disabled) return;
    const body = {
      actorAccountId,
      revision: baseline.current.revision,
      url: values.url,
    };
    const label = active ? "Remplacer le lien" : "Publier le lien";
    const accepted = await confirm({
      title: active ? "Remplacer ce lien ?" : "Publier ce lien ?",
      message: baseline.current.activeUrl
        ? `${baseline.current.activeUrl}\n\nNouveau lien : ${values.url}`
        : values.url,
      confirmLabel: label,
      cancelLabel: "Continuer la saisie",
    });
    if (!accepted || !mounted.current) return;
    feedback.clear();
    try {
      const result = await editing.publish.mutateAsync(body);
      if (mounted.current) {
        baseline.current = {
          revision: result.revision,
          activeUrl: result.contribution.url,
        };
        reset(contributionValues(result.contribution.url));
        onSuccess();
      }
    } catch {
      if (mounted.current)
        feedback.error(
          "La publication n’a pas pu être confirmée. Votre saisie est conservée.",
        );
    }
  }
  return (
    <Surface>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          {active ? "Lien public" : "Publier un lien"}
        </Text>
        {active?.canWithdraw && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retirer"
            accessibilityState={{ disabled: !editing.allowed || busy }}
            disabled={!editing.allowed || busy || editing.query.isError}
            onPress={onWithdraw}
            style={styles.withdraw}
          >
            <Text
              style={[
                tokens.typography.body,
                { color: colors.error, textDecorationLine: "underline" },
              ]}
            >
              Retirer
            </Text>
          </Pressable>
        )}
      </View>
      <View style={styles.form}>
        <Controller
          control={control}
          name="url"
          render={({ field, fieldState }) => (
            <TextField
              ref={field.ref}
              label="Adresse du lien"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!busy && current.canPublish}
              helper="YouTube, Twitch ou Facebook"
            />
          )}
        />
        {!current.canPublish && (
          <Text
            style={[tokens.typography.body, { color: colors.secondaryText }]}
          >
            La publication n’est pas autorisée pour ce match.
          </Text>
        )}
        <Button
          label={active ? "Remplacer le lien" : "Publier le lien"}
          fullWidth
          loading={editing.publish.isPending}
          disabled={disabled || busy}
          onPress={() => void handleSubmit(send)()}
        />
      </View>
    </Surface>
  );
}
const styles = StyleSheet.create({
  form: { gap: tokens.layout.form.gap },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  title: { ...tokens.typography.title, flex: 1 },
  withdraw: {
    minHeight: tokens.touch.minimum,
    minWidth: tokens.touch.minimum,
    justifyContent: "center",
    alignItems: "center",
  },
});
