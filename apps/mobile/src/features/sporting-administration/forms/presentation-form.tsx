import { zodResolver } from "@hookform/resolvers/zod";
import { Image } from "expo-image";
import { ImageOff } from "lucide-react-native";
import { useDivisionActivity } from "../api/classification";
import { DivisionColorFields } from "../components/division-color-fields";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Controller, useForm, useFormState, useWatch } from "react-hook-form";
import { Alert, StyleSheet, Text, View } from "react-native";
import {
  ApiError,
  isUncertainMutationFailure,
} from "../../../shared/api/api-fetch";
import { DivisionActivityAction } from "../components/division-activity-action";
import type { DivisionResponse } from "../../../../.generated/schemas/index.zod";
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
import {
  discardPresentationEditor,
  presentationEditor,
} from "./presentation-editor";

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
  const router = useRouter();
  const activity = useDivisionActivity(target.id ?? "");
  const creating = target.kind === "division-creation";
  const isDivision = target.kind === "division" || creating;
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
  const draftName = useWatch({ control, name: "name" });
  const draftColor = useWatch({ control, name: "color" });
  const draftGradient = useWatch({ control, name: "gradient" });
  const previewColor = /^#[0-9a-fA-F]{6}$/.test(draftColor)
    ? draftColor
    : colors.mediaPlaceholder;
  // Subscribing to dirty fields is required by RHF's native keepDirtyValues reset option.
  const dirtyLogo = dirtyFields.logo !== undefined;
  const changed =
    presentation.kind !== "division-creation" &&
    baseline.kind !== "division-creation" &&
    presentation.data.revision !== baseline.data.revision;
  const rereadRequired = needsRead || changed;
  const created = creating && baseline.kind === "division";
  const busy =
    disabled ||
    created ||
    preparing ||
    isSubmitting ||
    editing.saving ||
    activity.saving ||
    editing.query.isFetching;
  const currentLogo =
    baseline.kind !== "pool" && baseline.kind !== "division-creation"
      ? baseline.data.logo
      : undefined;
  const selection = draft.action === "automatic" ? "automatic" : "effective";
  const hasLogo =
    draft.action === "automatic"
      ? currentLogo?.automaticUrl != null
      : currentLogo?.effectiveUrl != null;
  const artwork = usePresentationLogo(
    target,
    selection,
    hasLogo && draft.action !== "replace",
    baseline.kind === "division-creation" ? "" : baseline.data.revision,
  );
  const uri =
    draft.action === "replace"
      ? draft.prepared.uri
      : hasLogo
        ? artwork.data
        : undefined;
  const title =
    baseline.kind === "division-creation"
      ? "Nouvelle division"
      : baseline.kind === "division"
        ? baseline.data.name
        : baseline.data.names.effectiveName;
  const names =
    baseline.kind !== "division" && baseline.kind !== "division-creation"
      ? baseline.data.names
      : undefined;
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
    if (
      baseline.kind === "division-creation" &&
      baseline.data.items.some(
        (item) =>
          item.name.toLocaleLowerCase() ===
          values.name.trim().toLocaleLowerCase(),
      )
    ) {
      setError("name", {
        message:
          "Ce nom de division est déjà utilisé. Vérifiez la liste des divisions.",
      });
      return;
    }
    editor.update({ ...state, feedback: undefined });
    try {
      const accepted = await editing.save.mutateAsync({
        revision:
          baseline.kind === "division-creation" ? "" : baseline.data.revision,
        values,
      });
      if (!session.isCurrent(session.generation)) return;
      editor.update({
        baseline: accepted,
        needsRead: false,
        feedback: "Présentation enregistrée.",
      });
      reset(presentationValues(accepted));
      if (creating) {
        discardPresentationEditor(session.generation, target);
        onDirtyChange?.(false);
      }
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
          isDivision &&
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
  /** A lifecycle response advances this same revision while preserving all edited presentation values. */
  function activityAccepted(division: DivisionResponse) {
    if (!session.isCurrent(session.generation)) return;
    const accepted: Presentation = { kind: "division", data: division };
    editor.update({
      baseline: accepted,
      needsRead: false,
      feedback: division.active
        ? "Division réactivée. Les autres restrictions restent applicables."
        : "Division désactivée. L’historique est conservé.",
    });
    reset(presentationValues(accepted), { keepDirtyValues: true });
  }
  /** Uncertainty or revision conflict blocks both revision-dependent commands until this division is reread. */
  function activityFailed(error: unknown) {
    const requiresRead =
      isUncertainMutationFailure(error) ||
      (error instanceof ApiError && error.status === 409);
    editor.update({
      ...editor.getSnapshot(),
      needsRead: requiresRead,
      feedback: requiresRead
        ? "L’action n’a pas abouti. Relisez l’état courant avant de réessayer."
        : "L’action a été refusée. Votre présentation est conservée.",
    });
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
      <View
        style={[
          card,
          styles.context,
          isDivision && styles.divisionContext,
          isDivision && {
            backgroundColor: `${previewColor}14`,
            borderColor: `${previewColor}4D`,
          },
        ]}
      >
        {uri && (
          <Image
            source={{ uri }}
            contentFit="contain"
            cachePolicy="none"
            accessible={false}
            style={isDivision ? styles.divisionLogo : styles.contextLogo}
          />
        )}
        {isDivision && !uri && (
          <View
            style={[
              styles.divisionPlaceholder,
              { backgroundColor: colors.mediaPlaceholder },
            ]}
          >
            <ImageOff
              accessible={false}
              size={tokens.size.actionIcon}
              color={colors.icon}
            />
          </View>
        )}
        <View style={styles.contextName}>
          <Text style={[tokens.typography.strong, { color: colors.text }]}>
            {isDivision ? draftName.trim() || "Nouvelle division" : title}
          </Text>
          {isDivision && (
            <Text
              style={[
                tokens.typography.metadata,
                { color: colors.secondaryText },
              ]}
            >
              Aperçu
            </Text>
          )}
        </View>
        {isDivision && (
          <View style={styles.palette}>
            {(draftGradient.some((value) => value !== "")
              ? draftGradient
              : [previewColor, previewColor, previewColor]
            ).map((value, index) => (
              <View
                key={index}
                style={[
                  styles.paletteColor,
                  {
                    backgroundColor: /^#[0-9a-fA-F]{6}$/.test(value)
                      ? value
                      : previewColor,
                  },
                ]}
              />
            ))}
          </View>
        )}
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
              label={isDivision ? undefined : "Photo ou logo"}
              images={uri ? [{ id: "logo", uri, label: "Logo" }] : []}
              contentFit="contain"
              disabled={busy}
              helper="PNG/JPEG, jusqu’à 5 Mio"
              chooseLabel="Choisir un logo"
              replaceLabel="Changer le logo"
              removeLabel="Rétablir le logo automatique"
              error={errors.logo?.message}
              placeholderIcon={isDivision ? ImageOff : undefined}
              onRemove={
                !isDivision ||
                currentLogo?.manualUrl != null ||
                draft.action === "replace"
                  ? restoreLogo
                  : undefined
              }
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
                isDivision
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
      </View>
      {isDivision && (
        <DivisionColorFields
          control={control}
          setValue={setValue}
          disabled={busy}
        />
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
          label={
            target.kind === "division"
              ? "Relire la division"
              : "Relire la présentation"
          }
          variant="secondary"
          onPress={() => void reread()}
          disabled={
            preparing ||
            isSubmitting ||
            editing.saving ||
            activity.saving ||
            editing.query.isFetching
          }
          loading={editing.query.isFetching}
        />
      )}
      {created && (
        <Button
          label="Voir les divisions"
          variant="secondary"
          onPress={() => router.replace("/administration/divisions")}
        />
      )}
      {(!disabled || !isDivision) && (
        <Button
          label="Enregistrer"
          fullWidth
          disabled={busy || rereadRequired}
          loading={isSubmitting || preparing}
          onPress={() =>
            void handleSubmit((values) => {
              if (creating)
                Alert.alert(
                  "Créer la division ?",
                  "La nouvelle division sera active. Sa présentation ne changera jamais implicitement son activité.",
                  [
                    { text: "Annuler", style: "cancel" },
                    { text: "Confirmer", onPress: () => void submit(values) },
                  ],
                );
              else return submit(values);
            })()
          }
        />
      )}
      {baseline.kind === "division" && !creating && (
        <DivisionActivityAction
          division={baseline.data}
          editing={activity}
          disabled={
            preparing ||
            isSubmitting ||
            editing.saving ||
            editing.query.isFetching ||
            rereadRequired
          }
          onAccepted={activityAccepted}
          onFailure={activityFailed}
        />
      )}
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
  contextName: { flex: 1, gap: tokens.spacing.xs },
  divisionContext: {
    padding: tokens.spacing.compact,
    borderRadius: tokens.radius.control,
  },
  divisionLogo: { width: 38, height: 38 },
  divisionPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: tokens.radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  palette: { flexDirection: "row", gap: tokens.spacing.xs },
  paletteColor: { width: 8, height: 18, borderRadius: 2 },
});
