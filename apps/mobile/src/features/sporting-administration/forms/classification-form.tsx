import { useDiscardChanges } from "../../../shared/forms/use-discard-changes";
import {
  genderLabel,
  formatLabel,
} from "../../sporting/classification-presentation";
import {
  classificationSchema,
  classificationValues,
  type ClassificationValues,
} from "./classification-values";
import { toClassificationRequest } from "../api/classification-request";
import { ClassificationSelect } from "../components/classification-select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useForm, useFormState, useWatch, Controller } from "react-hook-form";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import type { ClassificationDetailResponse } from "../../../../.generated/schemas/index.zod";
import {
  ApiError,
  isUncertainMutationFailure,
} from "../../../shared/api/api-fetch";
import { Button } from "../../../shared/components/button";
import { RequestError } from "../../../shared/components/request-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import type {
  ClassificationTarget,
  useClassification,
  useDivisions,
} from "../api/classification";
import {
  classificationEditor,
  discardClassificationEditor,
} from "./classification-editor";

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
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [editor] = useState(() =>
    classificationEditor(session, target, current),
  );
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot);
  const { baseline, needsRead, feedback } = state;
  const { control, handleSubmit, reset, setError } =
    useForm<ClassificationValues>({
      resolver: zodResolver(classificationSchema),
      formControl: editor.form.formControl,
    });
  const { isDirty, isSubmitting, errors, dirtyFields } = useFormState({
    control,
  });
  useDiscardChanges(isDirty, () => {
    reset();
    discardClassificationEditor(session.generation, target);
  });
  void dirtyFields;
  const custom = useWatch({ control, name: "custom" });
  const divisionId = useWatch({ control, name: "divisionId" });
  const busy =
    !editing.authority.enabled ||
    isSubmitting ||
    editing.saving ||
    editing.query.isFetching ||
    divisions.query.isFetching;
  const rereadRequired = needsRead || current.revision !== baseline.revision;
  const choices =
    divisions.query.data?.items.filter((item) => item.active) ?? [];
  /** Sends the complete confirmed state once; every 409 or uncertain acknowledgement requires an explicit read. */
  async function save(values: ClassificationValues) {
    if (busy || rereadRequired || !session.isCurrent(session.generation))
      return;
    try {
      const accepted = await editing.save.mutateAsync(
        toClassificationRequest(baseline.revision, values),
      );
      if (!session.isCurrent(session.generation)) return;
      editor.update({
        baseline: accepted,
        needsRead: false,
        feedback: "Classification enregistrée.",
      });
      reset(classificationValues(accepted));
    } catch (error) {
      if (!session.isCurrent(session.generation)) return;
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
            : "L’enregistrement n’a pas abouti. Relisez l’état courant avant de réessayer.";
      editor.update({
        ...editor.getSnapshot(),
        needsRead:
          isUncertainMutationFailure(error) ||
          (error instanceof ApiError && error.status === 409),
        feedback: `${reason}${Array.isArray(conflictIds) && conflictIds.length > 0 ? ` Périmètres en conflit : ${conflictIds.join(", ")}.` : ""} Votre brouillon est conservé.`,
      });
    }
  }
  /** Validates all three fields and active choices before asking for a bounded native confirmation. */
  function confirm(values: ClassificationValues) {
    if (busy || rereadRequired) return;
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
    Alert.alert(
      "Confirmer la classification ?",
      "La correction est appliquée entièrement ou refusée. Retirer le réglage conserve les identités et la dernière classification publiée ; cela peut arrêter la collecte.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          onPress: () => {
            if (mounted.current) void save(values);
          },
        },
      ],
    );
  }
  /** Updates the revision and non-dirty values only after successful reads, without sending a write. */
  async function reread() {
    const [result, available] = await Promise.all([
      editing.query.refetch(),
      divisions.query.refetch(),
    ]);
    if (!mounted.current || !session.isCurrent(session.generation)) return;
    if (result.isError || !result.data || available.isError) {
      editor.update({
        ...editor.getSnapshot(),
        needsRead: true,
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
      needsRead: false,
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
            render={({ field }) => (
              <ClassificationSelect
                target={target}
                field="divisionId"
                label="Division"
                value={
                  choices.find((choice) => choice.id === field.value)?.name
                }
                disabled={busy}
                error={errors.divisionId?.message}
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
        loading={editing.saving}
        onPress={() => void handleSubmit(confirm)()}
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
      style={[
        styles.choice,
        {
          backgroundColor: selected ? colors.canvas : colors.subtle,
          borderColor: "transparent",
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
