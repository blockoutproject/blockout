import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useFormState } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import type { OwnStreamContributionsResponse } from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { requiresRevisionRead } from "../../../shared/api/mutation-recovery";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { Surface } from "../../../shared/components/surface";
import { TextField } from "../../../shared/components/text-field";
import { useDiscardChanges } from "../../../shared/forms/use-discard-changes";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import type { useOwnContributions } from "../api/own-contributions";
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
}
/** Retains typed addresses through refusals/refetches and leaves only after a current acknowledged submission. */
export function ContributionForm({
  matchId,
  current,
  editing,
}: ContributionFormProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const feedback = useActionFeedback();
  const [editor] = useState(() => contributionEditor(editing.session, matchId));
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
  useDiscardChanges(isDirty, () => {
    reset(contributionValues());
    editor.release();
  });
  const { session, submit, query } = editing;
  const busy = submit.pending || query.isFetching;
  const disabled =
    !editing.usable || query.isError || !current.eligibility.canSubmit;

  /** Reads current state after a conflict/uncertain response without interpreting it as historical acknowledgement. */
  async function reread() {
    feedback.clear();
    const { result, reconciled } = await editing.reread();
    if (
      mounted.current &&
      session.isCurrent(session.generation) &&
      (result.isError || !reconciled)
    )
      feedback.error();
  }
  /** Sends the validated literal once; failures preserve the draft and acknowledged writes alone clear dirty state. */
  async function send(values: ContributionValues) {
    if (
      busy ||
      disabled ||
      submit.needsRead ||
      !session.isCurrent(session.generation)
    )
      return;
    feedback.clear();
    const attempt = submit.start({
      revision: current.revision,
      url: values.url,
    });
    if (!attempt) return;
    try {
      const accepted = await attempt;
      if (!session.isCurrent(session.generation)) return;
      reset(contributionValues(accepted.contribution.url));
      editor.release();
      if (mounted.current) router.back();
    } catch (error) {
      if (!mounted.current || !session.isCurrent(session.generation)) return;
      if (error instanceof ApiError && error.status === 422) {
        setError("url", {
          message: "Le lien a été refusé. Votre saisie est conservée.",
        });
        const result = await editing.refresh();
        if (
          mounted.current &&
          session.isCurrent(session.generation) &&
          result?.isError
        )
          feedback.error();
      } else if (requiresRevisionRead(error)) await reread();
      else
        feedback.error(
          "La contribution est indisponible. Votre saisie est conservée.",
        );
    }
  }
  return (
    <Surface>
      <Text
        accessibilityRole="header"
        style={[tokens.typography.title, { color: colors.text }]}
      >
        Proposer un lien
      </Text>
      <Text style={[tokens.typography.body, { color: colors.text }]}>
        Une adresse de diffusion pour ce match.
      </Text>
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
              helper="YouTube, Twitch ou Facebook : vidéo, chaîne ou page. L’adresse ne prouve pas la disponibilité d’un direct ou d’un replay."
            />
          )}
        />
        {!current.eligibility.canSubmit && (
          <Text
            accessibilityLiveRegion="polite"
            style={[tokens.typography.body, { color: colors.text }]}
          >
            {current.eligibility.reason ??
              "La contribution n’est pas autorisée dans la situation actuelle."}
          </Text>
        )}
        {!current.eligibility.canSubmit &&
          editing.profile.data?.principalCreatedAt === null &&
          editing.profile.data.permissions.moderateStreamLinks !== true && (
            <Button
              label="Vérifier mon profil"
              variant="secondary"
              onPress={() => router.push("/profile")}
            />
          )}
        {current.eligibility.eligibleAt && (
          <Text
            style={[
              tokens.typography.metadata,
              { color: colors.secondaryText },
            ]}
          >
            Disponible à partir du{" "}
            {new Intl.DateTimeFormat("fr-FR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(current.eligibility.eligibleAt))}{" "}
            (heure locale).
          </Text>
        )}
        {current.eligibility.requiresApproval && (
          <Text
            style={[tokens.typography.body, { color: colors.secondaryText }]}
          >
            Votre proposition attendra une validation. Le lien déjà publié reste
            disponible.
          </Text>
        )}
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          {current.quota.versionsUsed}/3 versions pour ce match ·{" "}
          {current.quota.dailyMatchesUsed}/3 matchs aujourd’hui (heure de
          Paris).
        </Text>
        {query.isError && !submit.needsRead && (
          <Button
            label="Réessayer la lecture"
            loading={query.isFetching}
            onPress={async () => {
              feedback.clear();
              const result = await editing.refresh();
              if (
                mounted.current &&
                session.isCurrent(session.generation) &&
                result?.isError
              )
                feedback.error();
            }}
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
        {!submit.needsRead && requiresRevisionRead(submit.error) && (
          <Text
            accessibilityLiveRegion="polite"
            style={[tokens.typography.body, { color: colors.text }]}
          >
            {submit.error instanceof ApiError && submit.error.status === 409
              ? "La contribution a changé. L’état courant a été relu. Vérifiez votre saisie avant une nouvelle soumission."
              : "Le résultat de la demande reste incertain. L’état courant a été relu ; vérifiez-le avant une nouvelle soumission."}
          </Text>
        )}
        <Button
          label="Soumettre le lien"
          onPress={() => void handleSubmit(send)()}
          disabled={disabled || busy || submit.needsRead}
          loading={submit.executing}
        />
      </View>
    </Surface>
  );
}
const styles = StyleSheet.create({ form: { gap: tokens.layout.form.gap } });
