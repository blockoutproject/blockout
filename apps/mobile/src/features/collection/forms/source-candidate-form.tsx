import { Surface } from "../../../shared/components/surface";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { useNativeHandoff } from "../../../shared/native/use-native-handoff";
import { useActionConfirmation } from "../../../shared/forms/use-action-confirmation";
import { requiresRevisionRead } from "../../../shared/api/mutation-recovery";
import { useDiscardChanges } from "../../../shared/forms/use-discard-changes";
import { formatCollectionTimestamp } from "../model/collection-time";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { ChevronRight, Globe } from "lucide-react-native";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Controller, useForm, useFormState } from "react-hook-form";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type {
  CollectionSeasonResponse,
  SourceBindingResponse,
} from "../../../../.generated/schemas/index.zod";
import { Button } from "../../../shared/components/button";
import { RequestError } from "../../../shared/components/request-feedback";
import { TextField } from "../../../shared/components/text-field";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";
import { type useSourcePreparation } from "../api/use-source-preparation";
import {
  SeasonIdentity,
  SourceBadge,
  preparationStyles,
} from "../components/preparation-layout";
import {
  candidateUrlSchema,
  sourceCandidateSchema,
  type SourceCandidateValues,
} from "../schemas/source-candidate-schema";
import { sourceCandidateValues } from "./source-candidate-values";
import { sourcePreparationEditor } from "./source-candidate-editor";

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
  const { session } = authority;
  const { colors } = useTheme();
  const actionFeedback = useActionFeedback();
  const confirmAction = useActionConfirmation();
  const router = useRouter();
  const mounted = useRef(false);
  const [editor] = useState(() => sourcePreparationEditor(session, source));
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot);
  const { baseline, editingUrl } = state;
  const feedback =
    state.feedback ??
    (editing.candidate.needsRead
      ? "Le résultat doit être vérifié avant une nouvelle action."
      : editing.seasonInvalidated
        ? "L’état de la saison doit être relu avant une nouvelle action."
        : undefined);
  const { control, handleSubmit, reset } = useForm<SourceCandidateValues>({
    resolver: zodResolver(sourceCandidateSchema),
    formControl: editor.form.formControl,
  });
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
    !authority.enabled ||
    editing.candidate.pending ||
    editing.source.isFetching ||
    editing.season.isFetching;
  const reconciliationRequired =
    editing.candidate.needsRead ||
    editing.seasonInvalidated ||
    current.revision > baseline.revision;
  const rereadRequired = reconciliationRequired || editing.season.isError;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Cancels the URL draft without releasing the owner needed by later edits and temporary route removal. */
  async function cancelEditing() {
    if (editing.candidate.isPending()) return;
    const accepted = await confirmDiscard(() => {
      if (
        mounted.current &&
        session.isCurrent(session.generation) &&
        !editing.candidate.isPending()
      )
        reset(sourceCandidateValues(editor.getSnapshot().baseline));
    });
    if (
      !accepted ||
      !mounted.current ||
      !session.isCurrent(session.generation) ||
      editing.candidate.isPending()
    )
      return;
    editor.update({ ...editor.getSnapshot(), editingUrl: false });
  }

  /** A refusal retains input; ambiguous acknowledgements additionally prevent any new command until reread. */
  function failed(error: unknown) {
    if (!session.isCurrent(session.generation)) return;
    if (requiresRevisionRead(error)) {
      editor.update({
        ...editor.getSnapshot(),
        feedback: "Le résultat doit être vérifié avant une nouvelle action.",
      });
    } else {
      editor.update({ ...editor.getSnapshot(), feedback: undefined });
      actionFeedback.error(
        "L’action a été refusée. Votre saisie est conservée.",
      );
    }
  }
  /** Replaces only the candidate against its editing revision; a successful response invalidates old evidence. */
  async function save(values: SourceCandidateValues) {
    if (busy || readOnly || rereadRequired) return;
    try {
      const attempt = editing.candidate.start({
        revision: baseline.revision,
        candidateUrl: values.candidateUrl,
      });
      if (!attempt) return;
      editor.update({ ...editor.getSnapshot(), feedback: undefined });
      actionFeedback.clear();
      const accepted = await attempt;
      if (!session.isCurrent(session.generation)) return;
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
      const attempt = editing.validation.start({
        revision: baseline.revision,
      });
      if (!attempt) return;
      editor.update({ ...editor.getSnapshot(), feedback: undefined });
      actionFeedback.clear();
      const accepted = await attempt;
      if (!session.isCurrent(session.generation)) return;
      editor.update({
        ...editor.getSnapshot(),
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
    if (
      !session.isCurrent(session.generation) ||
      busy ||
      readOnly ||
      rereadRequired ||
      isDirty
    )
      return;
    try {
      const attempt = editing.confirmation.start({
        revision: baseline.revision,
        seasonLabel: season.label,
      });
      if (!attempt) return;
      editor.update({ ...editor.getSnapshot(), feedback: undefined });
      actionFeedback.clear();
      const accepted = await attempt;
      if (!session.isCurrent(session.generation)) return;
      editor.update({
        ...editor.getSnapshot(),
        baseline: accepted,
        feedback: undefined,
      });
    } catch (error) {
      failed(error);
    }
  }
  /** Reads source and season together; neither a failed read nor retained cache can unlock resubmission. */
  async function reread() {
    const {
      result: [sourceResult, seasonResult],
      reconciled,
    } = await editing.candidate.reconcile(
      [editing.sourceKey, editing.seasonKey],
      () => Promise.all([editing.source.refetch(), editing.season.refetch()]),
      ([sourceRead, seasonRead]) =>
        !sourceRead.isError &&
        !!sourceRead.data &&
        sourceRead.data.revision >= baseline.revision &&
        !seasonRead.isError &&
        !!seasonRead.data,
    );
    if (!mounted.current || !session.isCurrent(session.generation)) return;
    if (
      !reconciled ||
      sourceResult.isError ||
      seasonResult.isError ||
      !sourceResult.data ||
      !seasonResult.data ||
      sourceResult.data.revision < baseline.revision
    ) {
      editor.update({
        ...editor.getSnapshot(),
        feedback: "La relecture a échoué. Votre saisie est conservée.",
      });
      return;
    }
    reset(sourceCandidateValues(sourceResult.data), {
      keepDirtyValues: true,
      keepDirty: true,
    });
    editor.update({
      ...editor.getSnapshot(),
      baseline: sourceResult.data,
      feedback: "État relu. Vérifiez votre saisie avant une nouvelle action.",
    });
  }
  return (
    <View style={preparationStyles.form}>
      <SeasonIdentity season={editing.season.data ?? season} />
      {closed && (
        <Text style={[tokens.typography.strong, { color: colors.text }]}>
          Saison clôturée
        </Text>
      )}
      <Surface>
        <View style={[preparationStyles.row, styles.heading]}>
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
              size={tokens.size.controlIcon}
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
              size={tokens.size.controlIcon}
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
                  loading={editing.candidate.executing}
                />
                <Button
                  label="Annuler"
                  variant="secondary"
                  fullWidth
                  onPress={() => void cancelEditing()}
                  disabled={editing.candidate.pending}
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
                  loading={editing.validation.executing}
                />
              )}
            {current.validation === "confirmation-required" && (
              <Button
                label="Confirmer la saison"
                fullWidth
                onPress={confirmSeason}
                disabled={busy || rereadRequired || isDirty}
                loading={editing.confirmation.executing}
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
          size={tokens.size.controlIcon}
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
      {(editing.source.isError || editing.season.isError) && !feedback && (
        <RequestError
          message="La relecture a échoué. Votre saisie est conservée."
          onRetry={() => {
            void editing.source.refetch({ cancelRefetch: false });
            void editing.season.refetch({ cancelRefetch: false });
          }}
          retrying={editing.source.isFetching || editing.season.isFetching}
        />
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
  heading: { justifyContent: "space-between" },
  sourceLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.compact,
    minHeight: tokens.size.control,
  },
  url: { flex: 1, gap: tokens.spacing.xs },
});
