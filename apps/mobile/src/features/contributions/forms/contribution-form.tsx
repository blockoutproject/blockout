import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Controller, useForm, useFormState } from "react-hook-form";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  OwnStreamContributionResponse,
  OwnStreamContributionsResponse,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { Surface } from "../../../shared/components/surface";
import { TextField } from "../../../shared/components/text-field";
import { useActionConfirmation } from "../../../shared/forms/use-action-confirmation";
import { useDiscardChanges } from "../../../shared/forms/use-discard-changes";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { type useOwnContributions } from "../api/own-contributions";
import {
  contributionSchema,
  type ContributionValues,
} from "../schemas/contribution-schema";
import { contributionValues } from "./contribution-values";
import { contributionErrorMessage } from "../api/contribution-errors";

/** One mounted original-match address draft; normal RHF lifetime ends when the route is removed. */
export interface ContributionFormProps {
  matchId: string;
  current: OwnStreamContributionsResponse;
  editing: ReturnType<typeof useOwnContributions>;
  /** Current private active projection; pristine fields follow accepted version changes without replacing dirty drafts. */
  replacement?: OwnStreamContributionResponse;
}
/** Retains the ordinary address editor through page-owned refresh failures and confirms native intent before each write. */
export function ContributionForm({
  matchId,
  current,
  editing,
  replacement,
}: ContributionFormProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const feedback = useActionFeedback();
  const confirmAction = useActionConfirmation();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const { control, handleSubmit, reset, setError, getFieldState } =
    useForm<ContributionValues>({
      resolver: zodResolver(contributionSchema),
      defaultValues: contributionValues(replacement?.url),
    });
  const { isDirty } = useFormState({ control });
  useEffect(() => {
    // RHF owns dirtiness during this mounted visit; only a pristine field follows a newly accepted active version.
    if (replacement && !getFieldState("url").isDirty)
      reset(contributionValues(replacement.url));
  }, [getFieldState, replacement, reset]);
  useDiscardChanges(isDirty, () => {
    reset(contributionValues());
  });
  const { submit, change, query } = editing;
  const busy = submit.isPending || change.isPending || query.isFetching;
  const disabled =
    !editing.usable || query.isError || !current.eligibility.canSubmit;
  /** Acknowledges the saved address before leaving for the exact match, without abandoning a dirty form. */
  function finish(url: string) {
    reset(contributionValues(url));
    if (mounted.current) {
      router.dismissTo({ pathname: "/matches/[matchId]", params: { matchId } });
    }
  }
  /** Confirms the validated literal and viewed revision once; failures preserve the draft. */
  async function send(values: ContributionValues) {
    if (busy || disabled) return;
    const body = { revision: current.revision, url: values.url };
    const confirmed = await confirmAction({
      title: replacement ? "Remplacer ce lien ?" : "Soumettre ce lien ?",
      message: replacement
        ? `${replacement.url}\n\nNouveau lien : ${body.url}`
        : body.url,
      confirmLabel: replacement ? "Remplacer le lien" : "Soumettre le lien",
      cancelLabel: "Continuer la saisie",
    });
    if (!confirmed || !mounted.current) return;
    feedback.clear();
    const attempt = submit.mutateAsync(body);
    try {
      const accepted = await attempt;
      // A reopened route may already own this control while the original callback is detached.
      finish(accepted.contribution.url);
    } catch (error) {
      if (!mounted.current) return;
      if (error instanceof ApiError && error.status === 422) {
        setError("url", {
          message: "Le lien a été refusé. Votre saisie est conservée.",
        });
      } else feedback.error(contributionErrorMessage(error));
    }
  }
  /** Withdraws the exact displayed published version independently of eligibility for a new proposal. */
  async function withdraw() {
    if (!replacement?.canWithdraw || !editing.usable || query.isError || busy)
      return;
    const target = {
      versionId: replacement.id,
      body: { action: "withdraw" as const, revision: current.revision },
    };
    const confirmed = await confirmAction({
      title: "Retirer ce lien ?",
      message: `${replacement.url}\n\nSeule cette version est retirée. Votre proposition éventuelle reste en attente. Cette action ne restitue aucun quota consommé.`,
      confirmLabel: "Retirer le lien",
      cancelLabel: "Conserver",
      destructive: true,
    });
    if (!confirmed || !mounted.current) return;
    feedback.clear();
    const attempt = change.mutateAsync(target);
    try {
      const accepted = await attempt;
      finish(accepted.contribution.url);
    } catch (error) {
      if (!mounted.current) return;
      feedback.error(contributionErrorMessage(error));
    }
  }
  return (
    <Surface>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          {replacement ? "Votre lien public" : "Proposer un lien"}
        </Text>
        {replacement?.canWithdraw && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retirer"
            accessibilityState={{
              disabled: !editing.usable || query.isError || busy,
            }}
            disabled={!editing.usable || query.isError || busy}
            onPress={() => void withdraw()}
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
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!busy}
              error={fieldState.error?.message}
              helper="YouTube, Twitch ou Facebook"
            />
          )}
        />
        {current.eligibility.requiresApproval && (
          <Text
            style={[tokens.typography.body, { color: colors.secondaryText }]}
          >
            Ce lien sera soumis à validation.
          </Text>
        )}

        <Button
          label={replacement ? "Remplacer le lien" : "Soumettre le lien"}
          fullWidth
          onPress={() => void handleSubmit(send)()}
          disabled={disabled || busy}
          loading={submit.isPending}
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
