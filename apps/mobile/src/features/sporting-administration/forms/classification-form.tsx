import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
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
  classificationSchema,
  classificationValues,
  type ClassificationValues,
} from "./classification-editor";

/** One current resource, its generated operations and original-session draft. */
export interface ClassificationFormProps {
  target: ClassificationTarget;
  current: ClassificationDetailResponse;
  editing: ReturnType<typeof useClassification>;
  divisions: ReturnType<typeof useDivisions>;
  onDirtyChange?: (dirty: boolean) => void;
}
/** Complete override/inheritance correction with native confirmation and explicit current-state recovery. */
export function ClassificationForm({
  target,
  current,
  editing,
  divisions,
  onDirtyChange,
}: ClassificationFormProps) {
  const { session } = editing.authority;
  const { colors } = useTheme();
  const [editor] = useState(() =>
    classificationEditor(session, target, current),
  );
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot);
  const { baseline, needsRead, feedback } = state;
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { isDirty, isSubmitting, errors, dirtyFields },
  } = useForm<ClassificationValues>({
    resolver: zodResolver(classificationSchema),
    formControl: editor.form.formControl,
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
  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);
  /** Sends the complete confirmed state once; every 409 or uncertain acknowledgement requires an explicit read. */
  async function save(values: ClassificationValues) {
    if (busy || rereadRequired || !session.isCurrent(session.generation))
      return;
    try {
      const accepted = await editing.save.mutateAsync({
        revision: baseline.revision,
        classification: values.custom
          ? {
              divisionId: values.divisionId,
              format: values.format,
              gender: values.gender,
            }
          : null,
      });
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
      editor.update({
        ...editor.getSnapshot(),
        needsRead:
          isUncertainMutationFailure(error) ||
          (error instanceof ApiError && error.status === 409),
        feedback:
          Array.isArray(conflictIds) && conflictIds.length > 0
            ? `Correction entièrement refusée. Périmètres en conflit : ${conflictIds.join(", ")}. Votre brouillon est conservé.`
            : "L’enregistrement n’a pas abouti. Votre brouillon est conservé. Relisez l’état courant avant de réessayer.",
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
        { text: "Confirmer", onPress: () => void save(values) },
      ],
    );
  }
  /** Updates the revision and non-dirty values only after successful reads, without sending a write. */
  async function reread() {
    const [result, available] = await Promise.all([
      editing.query.refetch(),
      divisions.query.refetch(),
    ]);
    if (!session.isCurrent(session.generation)) return;
    if (result.isError || !result.data || available.isError) {
      editor.update({
        ...editor.getSnapshot(),
        needsRead: true,
        feedback: "La relecture a échoué. Votre brouillon est conservé.",
      });
      return;
    }
    reset(classificationValues(result.data), { keepDirtyValues: true });
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
          ? `Collecte : ${divisions.query.data?.items.find((item) => item.id === effective.divisionId)?.name ?? effective.divisionId}, ${effective.format}, ${effective.gender === "female" ? "Féminin" : effective.gender === "male" ? "Masculin" : "Mixte"}.`
          : "Aucune classification de collecte. La dernière classification publiée et les identités sont conservées."}
      </Text>
      <Controller
        control={control}
        name="custom"
        render={({ field }) => (
          <>
            <Choice
              label={
                target.kind === "pool"
                  ? "Hériter du pack"
                  : "Sans classification"
              }
              selected={!field.value}
              disabled={busy}
              onPress={() => field.onChange(false)}
            />
            <Choice
              label={
                target.kind === "pool"
                  ? "Classification propre"
                  : "Classification du pack"
              }
              selected={field.value}
              disabled={busy}
              onPress={() => field.onChange(true)}
            />
          </>
        )}
      />
      {custom && (
        <>
          <Text
            accessibilityRole="header"
            style={[tokens.typography.strong, { color: colors.text }]}
          >
            Division
          </Text>
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
              <>
                {choices.map((choice) => (
                  <Choice
                    key={choice.id}
                    label={choice.name}
                    selected={field.value === choice.id}
                    disabled={busy}
                    onPress={() => field.onChange(choice.id)}
                  />
                ))}
              </>
            )}
          />
          {divisionId &&
            !choices.some((choice) => choice.id === divisionId) && (
              <Text style={[tokens.typography.body, { color: colors.text }]}>
                La division sélectionnée est inactive ou indisponible.
                Choisissez une division active avant une nouvelle affectation.
              </Text>
            )}
          {errors.divisionId && (
            <Text
              accessibilityRole="alert"
              style={[tokens.typography.body, { color: colors.text }]}
            >
              {errors.divisionId.message}
            </Text>
          )}
          <Text
            accessibilityRole="header"
            style={[tokens.typography.strong, { color: colors.text }]}
          >
            Format
          </Text>
          <Controller
            control={control}
            name="format"
            render={({ field }) => (
              <>
                {(["6x6", "4x4", "2x2"] as const).map((format) => (
                  <Choice
                    key={format}
                    label={format}
                    selected={field.value === format}
                    disabled={busy}
                    onPress={() => field.onChange(format)}
                  />
                ))}
              </>
            )}
          />
          <Text
            accessibilityRole="header"
            style={[tokens.typography.strong, { color: colors.text }]}
          >
            Genre
          </Text>
          <Controller
            control={control}
            name="gender"
            render={({ field }) => (
              <>
                {(
                  [
                    { value: "female", label: "Féminin" },
                    { value: "male", label: "Masculin" },
                    { value: "mixed", label: "Mixte" },
                  ] as const
                ).map((gender) => (
                  <Choice
                    key={gender.value}
                    label={gender.label}
                    selected={field.value === gender.value}
                    disabled={busy}
                    onPress={() => field.onChange(gender.value)}
                  />
                ))}
              </>
            )}
          />
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
          backgroundColor: selected ? colors.raised : colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[tokens.typography.strong, { color: colors.text }]}>
        {selected ? "● " : "○ "}
        {label}
      </Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  form: { gap: tokens.spacing.md },
  choice: {
    minHeight: tokens.size.control,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.control,
    borderWidth: tokens.borderWidth,
  },
});
