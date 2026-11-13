import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Controller, useFormState, useWatch } from "react-hook-form";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ClassificationDetailResponse } from "../../../../.generated/schemas/index.zod";
import { ApiError } from "@/shared/api/api-fetch";
import { useActionFeedback } from "@/shared/components/action-feedback";
import { Button } from "@/shared/components/button";
import { SelectField } from "@/shared/components/select-field";
import { useDiscardChanges } from "@/shared/forms/use-discard-changes";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import {
  formatLabel,
  genderLabel,
} from "@/features/sporting/classification-presentation";
import {
  type useDivisions,
  type ClassificationTarget,
  type useClassification,
} from "../api/classification";
import { toClassificationRequest } from "../api/classification-request";
import { type ClassificationValues } from "../schemas/classification-schema";
import { classificationValues } from "./classification-values";
import type { useClassificationDraft } from "./use-classification-draft";

/** One current resource, its generated operations and original-session draft. */
export interface ClassificationFormProps {
  target: ClassificationTarget;
  current: ClassificationDetailResponse | null;
  editing: ReturnType<typeof useClassification>;
  editor: ReturnType<typeof useClassificationDraft>;
  divisions: ReturnType<typeof useDivisions>;
}

/** Complete override/inheritance correction with explicit revision recovery. */
export function ClassificationForm({
  target,
  current,
  editing,
  editor,
  divisions,
}: Readonly<ClassificationFormProps>) {
  const router = useRouter();
  const { colors } = useTheme();
  const actionFeedback = useActionFeedback();
  const mounted = useRef(false);
  const [rereading, setRereading] = useState(false);
  const state = editor.state;
  const { revision } = state;
  const feedback = state.feedback;
  const { control, handleSubmit, reset, setError } = editor.form;
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
    rereading ||
    !current ||
    !editing.authority.enabled ||
    editing.save.isPending;
  const choicesUnavailable = !divisions.query.isSuccess;
  const choicesBusy = busy || divisions.query.isFetching || choicesUnavailable;
  const rereadRequired = current !== null && current.revision !== revision;
  const choices =
    divisions.query.data?.items.filter((item) => item.active) ?? [];
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Validates active custom choices and sends the complete state against its editing revision. */
  async function submit(values: ClassificationValues) {
    if (busy || !revision || rereadRequired) {
      return;
    }
    if (values.custom && (choicesUnavailable || divisions.query.isFetching)) {
      return;
    }
    if (
      values.custom &&
      !choices.some((choice) => choice.id === values.divisionId)
    ) {
      setError("divisionId", {
        message: "Choisissez une division active disponible.",
      });
      return;
    }
    try {
      const attempt = editing.save.mutateAsync(
        toClassificationRequest(revision, values),
      );
      editor.update({ ...editor.state, feedback: undefined });
      actionFeedback.clear();
      const accepted = await attempt;
      editor.update({
        revision: accepted.revision,
        feedback: undefined,
      });
      reset(classificationValues(accepted));
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        error.status !== 409 ||
        error.problem?.type !== "urn:blockout:problem:classification-conflict"
      ) {
        actionFeedback.error();
        return;
      }
      showConflict(error);
    }
  }

  /** Keeps the draft and identifies classification scopes requiring correction. */
  function showConflict(error: ApiError) {
    const conflictIds =
      error.problem && "conflictingResourceIds" in error.problem
        ? error.problem.conflictingResourceIds
        : undefined;
    const reason =
      "Correction entièrement refusée : division inactive, participations partagées ou identité d’équipe incompatible. Réduisez le périmètre ou demandez une intervention technique.";
    editor.update({
      ...editor.state,
      feedback: `${reason}${Array.isArray(conflictIds) && conflictIds.length > 0 ? ` Périmètres en conflit : ${conflictIds.join(", ")}.` : ""} Votre brouillon est conservé.`,
    });
  }

  /** Updates the revision and non-dirty values only after successful reads, without sending a write. */
  async function reread() {
    if (rereading || editing.save.isPending) {
      return;
    }
    setRereading(true);
    try {
      const [result, available] = await Promise.all([
        editing.query.refetch(),
        ...(custom ? [divisions.query.refetch()] : []),
      ]);
      if (!mounted.current) {
        return;
      }
      if (result.isError || !result.data || available?.isError) {
        return;
      }
      reset(classificationValues(result.data), {
        keepDirtyValues: true,
        keepDirty: true,
      });
      editor.update({
        revision: result.data.revision,
        feedback: "État relu. Vérifiez le brouillon puis enregistrez-le.",
      });
    } finally {
      if (mounted.current) {
        setRereading(false);
      }
    }
  }

  const effective = current?.effective;
  const effectiveDivision = divisions.query.data?.items.find(
    (item) => item.id === effective?.divisionId,
  );
  return (
    <View style={styles.form}>
      {current && (
        <Text style={[tokens.typography.body, { color: colors.text }]}>
          {effective
            ? `Collecte : ${effectiveDivision ? `${effectiveDivision.name}, ` : ""}${effective.format}, ${genderLabel(effective.gender)}.`
            : "Aucune classification de collecte. La dernière classification publiée et les identités sont conservées."}
        </Text>
      )}
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
          <Controller
            control={control}
            name="divisionId"
            render={({ field, fieldState }) => (
              <SelectField
                onPress={() =>
                  router.push({
                    pathname: "/administration/classification-selection",
                    params: { ...target, field: "divisionId" },
                  })
                }
                label="Division"
                value={
                  divisions.query.data?.items.find(
                    (choice) => choice.id === field.value,
                  )?.name
                }
                disabled={choicesBusy}
                error={
                  divisions.query.isSuccess
                    ? fieldState.error?.message
                    : undefined
                }
              />
            )}
          />
          {divisionId &&
            divisions.query.isSuccess &&
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
                <SelectField
                  onPress={() =>
                    router.push({
                      pathname: "/administration/classification-selection",
                      params: { ...target, field: "gender" },
                    })
                  }
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
                <SelectField
                  onPress={() =>
                    router.push({
                      pathname: "/administration/classification-selection",
                      params: { ...target, field: "format" },
                    })
                  }
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
          disabled={
            rereading || !editing.authority.enabled || editing.save.isPending
          }
          onPress={() => void reread()}
        />
      )}
      <Button
        label="Enregistrer"
        fullWidth
        disabled={busy || rereadRequired || (custom && choicesBusy)}
        loading={editing.save.isPending}
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
}: Readonly<{
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}>) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => {
        let opacity = 1;
        if (disabled) {
          opacity = tokens.opacity.disabled;
        } else if (pressed) {
          opacity = tokens.opacity.pressed;
        }
        return [
          styles.choice,
          {
            backgroundColor: selected ? colors.canvas : colors.subtle,
            borderColor: "transparent",
            opacity,
          },
        ];
      }}
    >
      <Text style={[tokens.typography.strong, { color: colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  form: { gap: tokens.layout.form.gap },
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
    minHeight: tokens.size.control.default,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.control,
    borderWidth: tokens.border.thin,
  },
});
