import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useFormState } from "react-hook-form";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  OwnStreamContributionResponse,
  OwnStreamContributionsResponse,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { requiresRevisionRead } from "../../../shared/api/mutation-recovery";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { Surface } from "../../../shared/components/surface";
import { TextField } from "../../../shared/components/text-field";
import { useActionConfirmation } from "../../../shared/forms/use-action-confirmation";
import { useDiscardChanges } from "../../../shared/forms/use-discard-changes";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import {
  isOwnContributionAccessDenied,
  type useOwnContributions,
} from "../api/own-contributions";
import {
  contributionSchema,
  type ContributionValues,
} from "../schemas/contribution-schema";
import { contributionEditor } from "./contribution-editor";
import { contributionValues } from "./contribution-values";

/** One original-match address draft; current context disables dispatch while RHF retains values across admission detours. */
export interface ContributionFormProps {
  matchId: string;
  current: OwnStreamContributionsResponse;
  editing: ReturnType<typeof useOwnContributions>;
  /** Current private active projection; pristine fields follow accepted version changes without replacing dirty drafts. */
  replacement?: OwnStreamContributionResponse;
}
/** Shares the ordinary address editor for new proposals and the current public version, with native intent confirmation before each write. */
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
  const [editor] = useState(() =>
    contributionEditor(editing.session, matchId, replacement?.url),
  );
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (!editor.form.getFieldState("url").isDirty) editor.release();
    };
  }, [editor]);
  const { control, handleSubmit, reset, setError } =
    useForm<ContributionValues>({
      resolver: zodResolver(contributionSchema),
      formControl: editor.form.formControl,
    });
  const { isDirty } = useFormState({ control });
  useEffect(() => {
    // RHF owns dirtiness even across route removal; only a pristine field follows a newly accepted active version.
    if (replacement && !editor.form.getFieldState("url").isDirty)
      reset(contributionValues(replacement.url));
  }, [editor, replacement, reset]);
  useDiscardChanges(isDirty, () => {
    reset(contributionValues());
    editor.release();
  });
  const { session, submit, change, query } = editing;
  const busy = submit.pending || query.isFetching;
  const recoveryError = submit.error ?? change.error;
  const disabled =
    !editing.usable || query.isError || !current.eligibility.canSubmit;

  /** Rereads the original collection while preserving the draft and reporting failures only to its mounted owner. */
  async function refresh() {
    feedback.clear();
    try {
      await editing.refresh();
    } catch {
      if (mounted.current && session.isCurrent(session.generation))
        feedback.error();
    }
  }
  /** Reads current state after a conflict/uncertain response without interpreting it as historical acknowledgement. */
  async function reread() {
    feedback.clear();
    try {
      const { reconciled } = await editing.reread();
      if (
        mounted.current &&
        session.isCurrent(session.generation) &&
        !reconciled
      )
        feedback.error();
    } catch {
      if (mounted.current && session.isCurrent(session.generation))
        feedback.error();
    }
  }
  /** Acknowledges the saved address before leaving for the exact match, without abandoning a dirty form. */
  function finish(url: string) {
    if (!session.isCurrent(session.generation)) return;
    reset(contributionValues(url));
    if (mounted.current) {
      editor.release();
      router.dismissTo({ pathname: "/matches/[matchId]", params: { matchId } });
    }
  }
  /** Confirms the validated literal and viewed revision once; failures preserve the draft. */
  async function send(values: ContributionValues) {
    if (
      busy ||
      disabled ||
      submit.needsRead ||
      !session.isCurrent(session.generation)
    )
      return;
    const body = { revision: current.revision, url: values.url };
    const confirmed = await confirmAction({
      title: replacement ? "Remplacer ce lien ?" : "Soumettre ce lien ?",
      message: replacement
        ? `${replacement.url}\n\nNouveau lien : ${body.url}`
        : body.url,
      confirmLabel: replacement ? "Remplacer le lien" : "Soumettre le lien",
      cancelLabel: "Continuer la saisie",
    });
    if (
      !confirmed ||
      !mounted.current ||
      !session.isCurrent(session.generation)
    )
      return;
    feedback.clear();
    const attempt = submit.start(body);
    if (!attempt) return;
    try {
      const accepted = await attempt;
      // A reopened route may already own this control while the original callback is detached.
      finish(accepted.contribution.url);
    } catch (error) {
      if (!mounted.current || !session.isCurrent(session.generation)) return;
      if (error instanceof ApiError && error.status === 422) {
        setError("url", {
          message: "Le lien a été refusé. Votre saisie est conservée.",
        });
        await refresh();
      } else if (requiresRevisionRead(error)) await reread();
      else
        feedback.error(
          "La contribution est indisponible. Votre saisie est conservée.",
        );
    }
  }
  /** Withdraws the exact displayed published version independently of eligibility for a new proposal. */
  async function withdraw() {
    if (
      !replacement?.canWithdraw ||
      !editing.usable ||
      query.isError ||
      busy ||
      submit.needsRead
    )
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
    if (
      !confirmed ||
      !mounted.current ||
      !session.isCurrent(session.generation)
    )
      return;
    feedback.clear();
    const attempt = change.start(target);
    if (!attempt) return;
    try {
      const accepted = await attempt;
      finish(accepted.contribution.url);
    } catch (error) {
      if (!mounted.current || !session.isCurrent(session.generation)) return;
      if (requiresRevisionRead(error) || isOwnContributionAccessDenied(error))
        await reread();
      else
        feedback.error(
          "La modification est indisponible. Relisez votre contribution avant de réessayer.",
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
          {replacement
            ? query.isError
              ? "Dernier lien public connu"
              : "Votre lien public"
            : "Proposer un lien"}
        </Text>
        {replacement?.canWithdraw && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retirer"
            accessibilityState={{
              disabled:
                !editing.usable || query.isError || busy || submit.needsRead,
            }}
            disabled={
              !editing.usable || query.isError || busy || submit.needsRead
            }
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
        {query.isError && !submit.needsRead && (
          <Button
            label="Réessayer la lecture"
            loading={query.isFetching}
            onPress={() => void refresh()}
          />
        )}
        {submit.needsRead && (
          <>
            <Text
              accessibilityLiveRegion="polite"
              style={[tokens.typography.body, { color: colors.text }]}
            >
              Le résultat doit être vérifié. Relisez l’état courant avant de
              réessayer. Votre saisie est conservée.
            </Text>
            <Button
              label="Vérifier la contribution"
              loading={query.isFetching}
              onPress={() => void reread()}
            />
          </>
        )}
        {!submit.needsRead && requiresRevisionRead(recoveryError) && (
          <Text
            accessibilityLiveRegion="polite"
            style={[tokens.typography.body, { color: colors.text }]}
          >
            {recoveryError instanceof ApiError && recoveryError.status === 409
              ? "La contribution a changé. L’état courant a été relu. Vérifiez votre saisie avant une nouvelle action."
              : "Le résultat de la demande reste incertain. L’état courant a été relu ; vérifiez-le avant une nouvelle action."}
          </Text>
        )}
        <Button
          label={replacement ? "Remplacer le lien" : "Soumettre le lien"}
          fullWidth
          onPress={() => void handleSubmit(send)()}
          disabled={disabled || busy || submit.needsRead}
          loading={submit.executing}
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
