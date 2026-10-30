import { ApiError } from "../../../shared/api/api-fetch";
import { SeasonIdentity, SourceBadge } from "../components/source-summary";
import { Surface } from "../../../shared/components/surface";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { useNativeHandoff } from "../../../shared/native/use-native-handoff";
import { useActionConfirmation } from "../../../shared/forms/use-action-confirmation";
import { useDiscardChanges } from "../../../shared/forms/use-discard-changes";
import { formatCollectionTimestamp } from "../model/collection-time";
import { useRouter } from "expo-router";
import { ChevronRight, Globe } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Controller, useFormState } from "react-hook-form";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  CollectionSeasonResponse,
  SourceBindingResponse,
} from "../../../../.generated/schemas/index.zod";
import { Button } from "../../../shared/components/button";
import { TextField } from "../../../shared/components/text-field";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { type useSourcePreparation } from "../api/use-source-preparation";
import {
  candidateUrlSchema,
  type SourceCandidateValues,
} from "../schemas/source-candidate-schema";
import { sourceCandidateValues } from "./source-candidate-values";
import { useSourceCandidateDraft } from "./use-source-candidate-draft";

/** One source editor snapshot; failures and current-state reads preserve its dirty URL until explicit submission. */
export interface SourceCandidateFormProps {
  source: SourceBindingResponse;
  season: CollectionSeasonResponse;
  editing: ReturnType<typeof useSourcePreparation>;
}
/** Inline supported-candidate editing and explicit qualification/confirmation, without post-launch repair. */
export function SourceCandidateForm({
  source,
  season,
  editing,
}: SourceCandidateFormProps) {
  const { authority } = editing;
  const { colors } = useTheme();
  const actionFeedback = useActionFeedback();
  const confirmAction = useActionConfirmation();
  const router = useRouter();
  const mounted = useRef(false);
  const editor = useSourceCandidateDraft(source);
  const state = editor.state;
  const { baseline, editingUrl } = state;
  const feedback = state.feedback ?? undefined;
  const { control, handleSubmit, reset } = editor.form;
  const { isDirty, dirtyFields } = useFormState({
    control,
  });
  const confirmDiscard = useDiscardChanges(isDirty, editor.discard);
  // Subscribe to RHF's dirty fields so keepDirtyValues retains the editable snapshot on reread.
  void dirtyFields;
  const current = editing.source.data ?? source;
  const savedUrl = current.acceptedUrl ?? current.candidateUrl;
  const officialUrl =
    savedUrl && candidateUrlSchema.safeParse(savedUrl).success
      ? new URL(savedUrl)
      : undefined;
  const handoff = useNativeHandoff(
    officialUrl ? (savedUrl ?? undefined) : undefined,
  );
  const closed = (editing.season.data ?? season).state === "closed";
  const readOnly = closed || current.locked || current.launched;
  const busy =
    editing.source.isError ||
    !authority.enabled ||
    editing.candidate.isPending ||
    editing.validation.isPending ||
    editing.confirmation.isPending ||
    editing.source.isFetching ||
    editing.season.isFetching;
  const reconciliationRequired = current.revision > baseline.revision;
  const rereadRequired = reconciliationRequired || editing.season.isError;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  /** Cancels the URL draft without releasing the owner needed by later edits and temporary route removal. */
  async function cancelEditing() {
    if (editing.candidate.isPending) return;
    const accepted = await confirmDiscard(() => {
      if (mounted.current && !editing.candidate.isPending)
        reset(sourceCandidateValues(editor.state.baseline));
    });
    if (!accepted || !mounted.current || editing.candidate.isPending) return;
    editor.update({ ...editor.state, editingUrl: false });
  }
  /** A refusal retains input; ambiguous acknowledgements additionally prevent any new command until reread. */
  function failed(error: unknown) {
    if (error instanceof ApiError && error.status === 409) {
      editor.update({
        ...editor.state,
        feedback: "Le résultat doit être vérifié avant une nouvelle action.",
      });
    } else {
      editor.update({ ...editor.state, feedback: undefined });
      actionFeedback.error();
    }
  }
  /** Replaces only the candidate against its editing revision; a successful response invalidates old evidence. */
  async function save(values: SourceCandidateValues) {
    if (busy || readOnly || rereadRequired) return;
    try {
      const attempt = editing.candidate.mutateAsync({
        revision: baseline.revision,
        candidateUrl: values.candidateUrl,
      });
      editor.update({ ...editor.state, feedback: undefined });
      actionFeedback.clear();
      const accepted = await attempt;
      reset(sourceCandidateValues(accepted));
      editor.update({
        baseline: accepted,
        editingUrl: false,
        feedback:
          accepted.validation === "unvalidated"
            ? "Lien enregistré. La source doit être validée à nouveau."
            : undefined,
      });
    } catch (error) {
      failed(error);
    }
  }
  /** Requests validation once; 202 stays pending until an operator rereads the binding. */
  async function validate() {
    if (busy || readOnly || rereadRequired || isDirty) return;
    try {
      const attempt = editing.validation.mutateAsync({
        revision: baseline.revision,
      });
      editor.update({ ...editor.state, feedback: undefined });
      actionFeedback.clear();
      const accepted = await attempt;
      editor.update({
        ...editor.state,
        baseline: accepted,
        feedback: undefined,
      });
    } catch (error) {
      failed(error);
    }
  }
  /** Confirms only missing seasonal attribution, retaining the exact canonical season label. */
  async function confirmSeason() {
    if (
      busy ||
      readOnly ||
      rereadRequired ||
      isDirty ||
      current.validation !== "confirmation-required"
    )
      return;
    if (
      !(await confirmAction({
        title: `Confirmer ${season.label} ?`,
        message:
          "Confirmez uniquement si cette page correspond bien à la saison préparée.",
        confirmLabel: "Confirmer la saison",
      }))
    )
      return;
    await acceptSeason();
  }
  /** The request boundary rechecks live grants/session even when a native alert callback was held. */
  async function acceptSeason() {
    if (busy || readOnly || rereadRequired || isDirty) return;
    try {
      const attempt = editing.confirmation.mutateAsync({
        revision: baseline.revision,
        seasonLabel: season.label,
      });
      editor.update({ ...editor.state, feedback: undefined });
      actionFeedback.clear();
      const accepted = await attempt;
      editor.update({
        ...editor.state,
        baseline: accepted,
        feedback: undefined,
      });
    } catch (error) {
      failed(error);
    }
  }
  /** Reads source and season together; neither a failed read nor retained cache can unlock resubmission. */
  async function reread() {
    const [sourceResult, seasonResult] = await (() =>
      Promise.all([editing.source.refetch(), editing.season.refetch()]))();
    if (!mounted.current) return;
    if (
      sourceResult.isError ||
      seasonResult.isError ||
      !sourceResult.data ||
      !seasonResult.data ||
      sourceResult.data.revision < baseline.revision
    ) {
      actionFeedback.error();
      return;
    }
    reset(sourceCandidateValues(sourceResult.data), {
      keepDirtyValues: true,
      keepDirty: true,
    });
    editor.update({
      ...editor.state,
      baseline: sourceResult.data,
      feedback: "État relu. Vérifiez votre saisie avant une nouvelle action.",
    });
  }
  return (
    <View style={styles.form}>
      <SeasonIdentity season={editing.season.data ?? season} />
      {closed && (
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          Saison clôturée
        </Text>
      )}
      <Surface>
        <View style={[styles.row, styles.heading]}>
          <Text style={[tokens.typography.strong, { color: colors.text }]}>
            Lien de découverte
          </Text>
          <SourceBadge source={current} />
        </View>
        {officialUrl ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Ouvrir la source officielle : ${officialUrl.host}`}
            onPress={handoff.open}
            disabled={handoff.pending}
            accessibilityState={{
              disabled: handoff.pending,
              busy: handoff.pending,
            }}
            style={({ pressed }) => [
              styles.sourceLink,
              {
                opacity: handoff.pending
                  ? tokens.opacity.disabled
                  : pressed
                    ? tokens.opacity.pressed
                    : 1,
              },
            ]}
          >
            <Globe
              accessible={false}
              color={colors.icon}
              size={tokens.size.icon.md}
            />
            <View style={styles.url}>
              <Text
                style={[
                  tokens.typography.metadata,
                  { color: colors.secondaryText },
                ]}
              >
                {officialUrl.host}
              </Text>
              <Text
                style={[
                  tokens.typography.metadata,
                  { color: colors.secondaryText },
                ]}
              >
                {officialUrl.pathname}
                {officialUrl.search}
              </Text>
            </View>
            <ChevronRight
              accessible={false}
              color={colors.icon}
              size={tokens.size.icon.md}
            />
          </Pressable>
        ) : (
          <Text
            style={[tokens.typography.body, { color: colors.secondaryText }]}
          >
            Aucun lien officiel renseigné.
          </Text>
        )}
        {current.seasonEvidence && (
          <Text style={[tokens.typography.body, { color: colors.text }]}>
            Preuve de saison : {current.seasonEvidence}
          </Text>
        )}
        {current.validatedAt && (
          <Text
            style={[
              tokens.typography.metadata,
              { color: colors.secondaryText },
            ]}
          >
            Validée le {formatCollectionTimestamp(current.validatedAt)}
          </Text>
        )}
        {current.reason && (
          <Text style={[tokens.typography.body, { color: colors.text }]}>
            {current.reason}
          </Text>
        )}
        {(!readOnly || editingUrl) && (
          <>
            {editingUrl ? (
              <>
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
                      editable={!busy && !readOnly}
                      autoCapitalize="none"
                      autoCorrect={false}
                      inputMode="url"
                      error={fieldState.error?.message}
                      helper="Formats officiels pris en charge uniquement. Modifier le lien efface sa validation précédente."
                    />
                  )}
                />
                <Button
                  label="Enregistrer"
                  fullWidth
                  onPress={() => void handleSubmit(save)()}
                  disabled={busy || readOnly || rereadRequired}
                  loading={editing.candidate.isPending}
                />
                <Button
                  label="Annuler"
                  variant="secondary"
                  fullWidth
                  onPress={() => void cancelEditing()}
                  disabled={editing.candidate.isPending}
                />
              </>
            ) : (
              <Button
                label="Modifier le lien"
                fullWidth
                variant="secondary"
                onPress={() => editor.update({ ...state, editingUrl: true })}
                disabled={busy}
              />
            )}
            {current.candidateUrl &&
              current.validation !== "pending" &&
              current.validation !== "qualified" &&
              current.validation !== "confirmation-required" && (
                <Button
                  label="Valider la source"
                  fullWidth
                  onPress={() => void validate()}
                  disabled={busy || rereadRequired || isDirty}
                  loading={editing.validation.isPending}
                />
              )}
            {current.validation === "confirmation-required" && (
              <Button
                label="Confirmer la saison"
                fullWidth
                onPress={confirmSeason}
                disabled={busy || rereadRequired || isDirty}
                loading={editing.confirmation.isPending}
              />
            )}
          </>
        )}
      </Surface>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={
          current.provider === "lnv"
            ? "Phases découvertes"
            : "Groupes découverts"
        }
        accessibilityState={{ disabled: !authority.enabled }}
        style={({ pressed }) => [
          styles.sourceLink,
          {
            opacity: !authority.enabled
              ? tokens.opacity.disabled
              : pressed
                ? tokens.opacity.pressed
                : 1,
          },
        ]}
        disabled={!authority.enabled}
        onPress={() =>
          router.push({
            pathname: "/collection/[seasonId]/sources/[sourceId]/children",
            params: { seasonId: season.id, sourceId: current.id },
          })
        }
      >
        <Text
          style={[
            tokens.typography.navigation,
            styles.url,
            { color: colors.text },
          ]}
        >
          {current.provider === "lnv"
            ? "Phases découvertes"
            : "Groupes découverts"}
        </Text>
        <ChevronRight
          accessible={false}
          size={tokens.size.icon.md}
          color={colors.icon}
        />
      </Pressable>
      {isDirty && (
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          Modifications non enregistrées
        </Text>
      )}
      {feedback && (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          style={[tokens.typography.body, { color: colors.text }]}
        >
          {feedback}
        </Text>
      )}

      {reconciliationRequired && (
        <Button
          label="Relire l’état"
          variant="secondary"
          onPress={() => void reread()}
          disabled={busy}
          loading={editing.source.isFetching || editing.season.isFetching}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  form: { gap: tokens.layout.form.gap },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.compact,
    flexWrap: "wrap",
  },
  heading: { justifyContent: "space-between" },
  sourceLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.compact,
    minHeight: tokens.size.control.default,
  },
  url: { flex: 1, gap: tokens.spacing.xs },
});
