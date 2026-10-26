import { useActionFeedback } from "../../../shared/components/action-feedback";
import { requiresRevisionRead } from "../../../shared/api/mutation-recovery";
import { useActionConfirmation } from "../../../shared/forms/use-action-confirmation";
import { useDiscardChanges } from "../../../shared/forms/use-discard-changes";
import {
  genderLabel,
  formatLabel,
} from "../../sporting/classification-presentation";
import {
  classificationSchema,
  type ClassificationValues,
} from "../schemas/classification-schema";
import { classificationValues } from "./classification-values";
import { toClassificationRequest } from "../api/classification-request";
import { ClassificationSelect } from "../components/classification-select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useForm, useFormState, useWatch, Controller } from "react-hook-form";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ClassificationDetailResponse } from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { Button } from "../../../shared/components/button";
import { RequestError } from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import type {
  ClassificationTarget,
  useClassification,
  useDivisions,
} from "../api/classification";
import { classificationEditor } from "./classification-editor";

/** One current resource, its generated operations and original-session draft. */
export interface ClassificationFormProps {
  target: ClassificationTarget;
  current: ClassificationDetailResponse;
  editing: ReturnType<typeof useClassification>;
  divisions: ReturnType<typeof useDivisions>;
}
/** Complete override/inheritance correction with native confirmation and explicit current-state recovery. */
export function ClassificationForm({
  target,
  current,
  editing,
  divisions,
}: ClassificationFormProps) {
  const { session } = editing.authority;
  const { colors } = useTheme();
  const actionFeedback = useActionFeedback();
  const confirmAction = useActionConfirmation();
  const mounted = useRef(false);
  const [editor] = useState(() =>
    classificationEditor(session, target, current),
  );
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot);
  const { baseline } = state;
  const feedback =
    state.feedback ??
    (editing.save.needsRead
      ? "Le résultat doit être vérifié. Relisez l’état courant avant de réessayer. Votre brouillon est conservé."
      : undefined);
  const { control, handleSubmit, reset, setError } =
    useForm<ClassificationValues>({
      resolver: zodResolver(classificationSchema),
      formControl: editor.form.formControl,
    });
  const { isDirty, dirtyFields } = useFormState({
    control,
  });
  useDiscardChanges(isDirty, () => {
    editor.discard();
  });
  void dirtyFields;
  const custom = useWatch({ control, name: "custom" });
  const divisionId = useWatch({ control, name: "divisionId" });
  const busy =
    !editing.authority.enabled ||
    editing.save.pending ||
    editing.query.isFetching ||
    divisions.query.isFetching;
  const rereadRequired =
    editing.save.needsRead || current.revision !== baseline.revision;
  const choices =
    divisions.query.data?.items.filter((item) => item.active) ?? [];

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Validates active choices, awaits confirmation and sends the complete state against its original revision. */
  async function submit(values: ClassificationValues) {
    if (busy || rereadRequired || !session.isCurrent(session.generation))
      return;
    if (
      values.custom &&
      (!divisions.query.isSuccess ||
        !choices.some((choice) => choice.id === values.divisionId))
    ) {
      setError("divisionId", {
        message: "Choisissez une division active disponible.",
      });
      return;
    }
    if (
      !(await confirmAction({
        title: "Enregistrer la classification ?",
        message:
          "La correction est appliquée entièrement ou refusée. Retirer le réglage conserve les identités et la dernière classification publiée ; cela peut arrêter la collecte.",
        confirmLabel: "Enregistrer",
      })) ||
      !session.isCurrent(session.generation)
    )
      return;
    try {
      const attempt = editing.save.start(
        toClassificationRequest(baseline.revision, values),
      );
      if (!attempt) return;
      editor.update({ ...editor.getSnapshot(), feedback: undefined });
      actionFeedback.clear();
      const accepted = await attempt;
      if (!session.isCurrent(session.generation)) return;
      editor.update({
        baseline: accepted,
        feedback: undefined,
      });
      reset(classificationValues(accepted));
    } catch (error) {
      if (!session.isCurrent(session.generation)) return;
      if (!requiresRevisionRead(error)) {
        editor.update({ ...editor.getSnapshot(), feedback: undefined });
        actionFeedback.error(
          "L’enregistrement a été refusé. Votre brouillon est conservé.",
        );
        return;
      }
      const conflictIds =
        error instanceof ApiError &&
        error.problem &&
        "conflictingResourceIds" in error.problem
          ? error.problem.conflictingResourceIds
          : undefined;
      const type = error instanceof ApiError ? error.problem?.type : undefined;
      const reason =
        type === "urn:blockout:problem:classification-conflict"
          ? "Correction entièrement refusée : division inactive, participations partagées ou identité d’équipe incompatible. Réduisez le périmètre ou demandez une intervention technique."
          : type === "urn:blockout:problem:stale-revision"
            ? "La classification a changé depuis votre lecture. Relisez l’état courant avant de confirmer votre brouillon."
            : "Le résultat doit être vérifié. Relisez l’état courant avant de réessayer.";
      editor.update({
        ...editor.getSnapshot(),
        feedback: `${reason}${Array.isArray(conflictIds) && conflictIds.length > 0 ? ` Périmètres en conflit : ${conflictIds.join(", ")}.` : ""} Votre brouillon est conservé.`,
      });
    }
  }
  /** Updates the revision and non-dirty values only after successful reads, without sending a write. */
  async function reread() {
    const {
      result: [result, available],
      reconciled,
    } = await editing.save.reconcile(
      [editing.queryKey, divisions.queryKey],
      () => Promise.all([editing.query.refetch(), divisions.query.refetch()]),
      ([result, available]) =>
        !result.isError && !!result.data && !available.isError,
    );
    if (!mounted.current || !session.isCurrent(session.generation)) return;
    if (!reconciled || result.isError || !result.data || available.isError) {
      editor.update({
        ...editor.getSnapshot(),
        feedback: "La relecture a échoué. Votre brouillon est conservé.",
      });
      return;
    }
    reset(classificationValues(result.data), {
      keepDirtyValues: true,
      keepDirty: true,
    });
    editor.update({
      baseline: result.data,
      feedback:
        "État relu. Vérifiez le brouillon puis confirmez explicitement l’enregistrement.",
    });
  }
  const effective = current.effective;
  return (
    <View style={styles.form}>
      <Text style={[tokens.typography.body, { color: colors.text }]}>
        {effective
          ? `Collecte : ${divisions.query.data?.items.find((item) => item.id === effective.divisionId)?.name ?? effective.divisionId}, ${effective.format}, ${genderLabel(effective.gender)}.`
          : "Aucune classification de collecte. La dernière classification publiée et les identités sont conservées."}
      </Text>
      <Controller
        control={control}
        name="custom"
        render={({ field }) => (
          <View style={[styles.segment, { backgroundColor: colors.subtle }]}>
            <Choice
              label={target.kind === "pool" ? "Du pack" : "Sans classification"}
              selected={!field.value}
              disabled={busy}
              onPress={() => field.onChange(false)}
            />
            <Choice
              label={
                target.kind === "pool"
                  ? "Personnalisé"
                  : "Classification du pack"
              }
              selected={field.value}
              disabled={busy}
              onPress={() => field.onChange(true)}
            />
          </View>
        )}
      />
      {custom && (
        <>
          {divisions.query.isError && (
            <RequestError
              message="Les divisions sont indisponibles."
              onRetry={() => void divisions.query.refetch()}
              retrying={divisions.query.isFetching}
            />
          )}
          <Controller
            control={control}
            name="divisionId"
            render={({ field, fieldState }) => (
              <ClassificationSelect
                target={target}
                field="divisionId"
                label="Division"
                value={
                  choices.find((choice) => choice.id === field.value)?.name
                }
                disabled={busy}
                error={fieldState.error?.message}
              />
            )}
          />
          {divisionId &&
            !choices.some((choice) => choice.id === divisionId) && (
              <Text
                style={[
                  tokens.typography.metadata,
                  { color: colors.secondaryText },
                ]}
              >
                La division sélectionnée est inactive ou indisponible.
                Choisissez une division active avant une nouvelle affectation.
              </Text>
            )}
          <View style={styles.row}>
            <Controller
              control={control}
              name="gender"
              render={({ field }) => (
                <ClassificationSelect
                  target={target}
                  field="gender"
                  label="Genre"
                  value={genderLabel(field.value)}
                  disabled={busy}
                />
              )}
            />
            <Controller
              control={control}
              name="format"
              render={({ field }) => (
                <ClassificationSelect
                  target={target}
                  field="format"
                  label="Format"
                  value={formatLabel(field.value)}
                  disabled={busy}
                />
              )}
            />
          </View>
        </>
      )}
      {isDirty && (
        <Text
          style={[tokens.typography.metadata, { color: colors.secondaryText }]}
        >
          Modifications non enregistrées
        </Text>
      )}
      {feedback && (
        <Text
          accessibilityLiveRegion="polite"
          style={[tokens.typography.body, { color: colors.text }]}
        >
          {feedback}
        </Text>
      )}
      {rereadRequired && (
        <Button
          label="Relire la classification"
          variant="secondary"
          disabled={busy}
          onPress={() => void reread()}
        />
      )}
      <Button
        label="Enregistrer"
        fullWidth
        disabled={busy || rereadRequired}
        loading={editing.save.executing}
        onPress={() => void handleSubmit(submit)()}
      />
    </View>
  );
}
/** A bounded native radio choice exposes the same selected/disabled state to touch and assistive navigation. */
function Choice({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        {
          backgroundColor: selected ? colors.canvas : colors.subtle,
          borderColor: "transparent",
          opacity: disabled
            ? tokens.opacity.disabled
            : pressed
              ? tokens.opacity.pressed
              : 1,
        },
      ]}
    >
      <Text style={[tokens.typography.strong, { color: colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  form: { gap: tokens.spacing.md },
  row: { flexDirection: "row", gap: tokens.spacing.md },
  segment: {
    flexDirection: "row",
    padding: tokens.spacing.xs,
    gap: tokens.spacing.xs,
    borderRadius: tokens.radius.control,
  },
  choice: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: tokens.size.control,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.control,
    borderWidth: tokens.borderWidth,
  },
});
