import { zodResolver } from "@hookform/resolvers/zod";
import { Image } from "expo-image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Controller, useForm, useFormState, useWatch } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import {
  ApiError,
  isUncertainMutationFailure,
} from "../../../shared/api/api-fetch";
import { Button } from "../../../shared/components/button";
import { ImageField } from "../../../shared/components/image-field";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { TextField } from "../../../shared/components/text-field";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useAccountSession } from "../../accounts/current-account";
import {
  usePresentationLogo,
  type Presentation,
  type PresentationTarget,
  type usePresentation,
} from "../api/presentation";
import { prepareSportingLogo } from "../images/prepare-sporting-logo";
import {
  presentationSchema,
  presentationValues,
  type PresentationValues,
} from "./presentation-values";
import { presentationEditor } from "./presentation-editor";

/** One original resource and session; background reads never replace this form's editable snapshot. */
export interface PresentationFormProps {
  presentation: Presentation;
  target: PresentationTarget;
  editing: ReturnType<typeof usePresentation>;
  disabled: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

/** Saves one revision atomically and retains dirty fields through refusals and explicit original-target rereads. */
export function PresentationForm({
  presentation,
  target,
  editing,
  disabled,
  onDirtyChange,
}: PresentationFormProps) {
  const session = useAccountSession();
  const { colors } = useTheme();
  const mounted = useRef(false);
  const [editor] = useState(() =>
    presentationEditor(session, target, presentation),
  );
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot);
  const { baseline, needsRead, feedback } = state;
  const [preparing, setPreparing] = useState(false);
  const { control, handleSubmit, setValue, setError, reset } =
    useForm<PresentationValues>({
      resolver: zodResolver(presentationSchema),
      formControl: editor.form.formControl,
    });
  // Read the retained control's current state on remount; RHF remains the sole submission owner.
  const { errors, isSubmitting, isDirty, dirtyFields } = useFormState({
    control,
  });
  const draft = useWatch({ control, name: "logo" });
  // Subscribing to dirty fields is required by RHF's native keepDirtyValues reset option.
  const dirtyLogo = dirtyFields.logo !== undefined;
  const changed = presentation.data.revision !== baseline.data.revision;
  const rereadRequired = needsRead || changed;
  const busy =
    disabled || preparing || isSubmitting || editing.query.isFetching;
  const currentLogo = baseline.kind !== "pool" ? baseline.data.logo : undefined;
  const selection = draft.action === "automatic" ? "automatic" : "effective";
  const hasLogo =
    draft.action === "automatic"
      ? currentLogo?.automaticUrl != null
      : currentLogo?.effectiveUrl != null;
  const artwork = usePresentationLogo(
    target,
    selection,
    !disabled && hasLogo && draft.action !== "replace",
    baseline.data.revision,
  );
  const uri =
    draft.action === "replace"
      ? draft.prepared.uri
      : hasLogo
        ? artwork.data
        : undefined;
  const title =
    baseline.kind === "division"
      ? baseline.data.name
      : baseline.data.names.effectiveName;
  const names = baseline.kind !== "division" ? baseline.data.names : undefined;
  const card = [
    styles.card,
    { backgroundColor: colors.surface, borderColor: colors.border },
  ];

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  /** Only the user's save event writes; conflicts and uncertain outcomes require a new current-state read. */
  async function submit(values: PresentationValues) {
    if (busy || rereadRequired || !session.isCurrent(session.generation))
      return;
    editor.update({ ...state, feedback: undefined });
    try {
      const accepted = await editing.save.mutateAsync({
        revision: baseline.data.revision,
        values,
      });
      if (!session.isCurrent(session.generation)) return;
      editor.update({
        baseline: accepted,
        needsRead: false,
        feedback: "Présentation enregistrée.",
      });
      reset(presentationValues(accepted));
    } catch (error) {
      if (!session.isCurrent(session.generation)) return;
      if (
        isUncertainMutationFailure(error) ||
        (error instanceof ApiError &&
          error.problem?.type === "urn:blockout:problem:stale-revision")
      ) {
        editor.update({
          ...editor.getSnapshot(),
          needsRead: true,
          feedback:
            "Le résultat doit être vérifié. Relisez la présentation avant de réessayer.",
        });
      } else {
        editor.update({
          ...editor.getSnapshot(),
          feedback:
            "L’enregistrement a été refusé. Votre brouillon est conservé.",
        });
        if (
          error instanceof ApiError &&
          (error.problem?.type === "urn:blockout:problem:invalid-image" ||
            error.status === 413)
        )
          setError("logo", {
            message:
              "Ce logo ne peut pas être enregistré. Choisissez une autre image.",
          });
        if (
          target.kind === "division" &&
          error instanceof ApiError &&
          error.problem?.type === "urn:blockout:problem:conflict"
        )
          setError("name", { message: "Ce nom de division est déjà utilisé." });
      }
    }
  }
  /** Refreshes non-dirty fields and the revision only after a successful explicit read; no write is replayed. */
  async function reread() {
    const result = await editing.query.refetch();
    if (!mounted.current || !session.isCurrent(session.generation)) return;
    if (result.isError || !result.data) {
      editor.update({
        ...state,
        needsRead: true,
        feedback: "La relecture a échoué. Votre brouillon est conservé.",
      });
      return;
    }
    editor.update({
      baseline: result.data,
      needsRead: false,
      feedback:
        "Présentation relue. Vérifiez votre brouillon avant de l’enregistrer à nouveau.",
    });
    reset(presentationValues(result.data), { keepDirtyValues: true });
  }
  /** Restoring is draft intent; source/LNV/club fallback is resolved by the existing binary read. */
  function restoreLogo() {
    setValue(
      "logo",
      { action: "automatic" },
      { shouldDirty: true, shouldValidate: true },
    );
  }
  return (
    <View style={styles.form}>
      <View style={[card, styles.context]}>
        {uri && (
          <Image
            source={{ uri }}
            contentFit="contain"
            cachePolicy="none"
            accessible={false}
            style={styles.contextLogo}
          />
        )}
        <Text style={[styles.contextName, { color: colors.text }]}>
          {title}
        </Text>
      </View>
      <View style={card}>
        {target.kind !== "pool" && (
          <>
            {draft.action !== "replace" && hasLogo && artwork.isFetching && (
              <RequestLoading />
            )}
            {draft.action !== "replace" && hasLogo && artwork.isError && (
              <RequestError
                message="Le logo est indisponible. Votre présentation est conservée."
                onRetry={() => void artwork.refetch()}
                retrying={artwork.isFetching}
              />
            )}
            <ImageField
              label="Photo ou logo"
              images={uri ? [{ id: "logo", uri, label: "Logo" }] : []}
              contentFit="contain"
              disabled={busy}
              helper="PNG/JPEG, jusqu’à 5 Mio"
              chooseLabel="Choisir un logo"
              replaceLabel="Changer le logo"
              removeLabel="Rétablir le logo automatique"
              error={errors.logo?.message}
              onRemove={restoreLogo}
              onSelect={async (assets) => {
                const asset = assets[0];
                if (!asset || !session.isCurrent(session.generation)) return;
                setPreparing(true);
                try {
                  const prepared = await prepareSportingLogo(asset, session);
                  if (mounted.current && session.isCurrent(session.generation))
                    setValue(
                      "logo",
                      { action: "replace", prepared },
                      { shouldDirty: true, shouldValidate: true },
                    );
                } catch {
                  if (mounted.current && session.isCurrent(session.generation))
                    setError("logo", {
                      message:
                        "Impossible de préparer le logo. Votre choix précédent est conservé.",
                    });
                } finally {
                  if (mounted.current && session.isCurrent(session.generation))
                    setPreparing(false);
                }
              }}
            />
            {!uri && (currentLogo?.manualUrl != null || dirtyLogo) && (
              <Button
                label="Rétablir le logo automatique"
                variant="secondary"
                onPress={restoreLogo}
                disabled={busy}
              />
            )}
          </>
        )}
        <Controller
          control={control}
          name="name"
          render={({ field: { value, onChange, onBlur, ref } }) => (
            <TextField
              ref={ref}
              label={
                target.kind === "division"
                  ? "Nom de la division"
                  : target.kind === "club"
                    ? "Nom personnalisé"
                    : "Nom complet personnalisé"
              }
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              editable={!busy}
              error={errors.name?.message}
              helper={
                names
                  ? `Laisser vide rétablit le nom automatique${names.sourceName ? ` : ${names.sourceName}` : ""}.`
                  : undefined
              }
            />
          )}
        />
        {(target.kind === "team" || target.kind === "pool") && (
          <Controller
            control={control}
            name="shortName"
            render={({ field: { value, onChange, onBlur, ref } }) => (
              <TextField
                ref={ref}
                label="Nom court personnalisé"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                editable={!busy}
                error={errors.shortName?.message}
                helper="Laisser vide rétablit le nom court automatique."
              />
            )}
          />
        )}
        {target.kind === "division" && (
          <>
            <Controller
              control={control}
              name="color"
              render={({ field: { value, onChange, onBlur, ref } }) => (
                <TextField
                  ref={ref}
                  label="Couleur"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!busy}
                  error={errors.color?.message}
                  helper="#RRGGBB"
                />
              )}
            />
            {([0, 1, 2] as const).map((index) => (
              <Controller
                key={index}
                control={control}
                name={`gradient.${index}`}
                render={({ field: { value, onChange, onBlur, ref } }) => (
                  <TextField
                    ref={ref}
                    label={`Dégradé ${index + 1}`}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!busy}
                    error={errors.gradient?.[index]?.message}
                    helper="Trois couleurs #RRGGBB, ou toutes vides pour le traitement automatique."
                  />
                )}
              />
            ))}
          </>
        )}
      </View>
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
          label="Relire la présentation"
          variant="secondary"
          onPress={() => void reread()}
          disabled={busy}
          loading={editing.query.isFetching}
        />
      )}
      <Button
        label="Enregistrer"
        fullWidth
        disabled={busy || rereadRequired}
        loading={isSubmitting || preparing}
        onPress={() => void handleSubmit(submit)()}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  form: { gap: tokens.spacing.lg },
  card: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.lg,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
  },
  context: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  contextLogo: { width: 64, height: 64, borderRadius: tokens.radius.media },
  contextName: { ...tokens.typography.strong, flex: 1 },
});
