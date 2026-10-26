import { useActionFeedback } from "../../../shared/components/action-feedback";
import { requiresPresentationReread } from "../api/presentation-recovery";
import { useActionConfirmation } from "../../../shared/forms/use-action-confirmation";
import { useImageSelection } from "../../../shared/images/use-image-selection";
import { ImageValidationError } from "../../../shared/images/image-validation-error";
import { deleteOwnedImage } from "../../../shared/images/delete-owned-image";
import { useDiscardChanges } from "../../../shared/forms/use-discard-changes";
import { zodResolver } from "@hookform/resolvers/zod";
import { Image } from "expo-image";
import { ImageOff } from "lucide-react-native";
import { useDivisionActivity } from "../api/classification";
import { DivisionColorFields } from "../components/division-color-fields";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Controller, useForm, useFormState, useWatch } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { ApiError } from "../../../shared/api/api-fetch";
import { DivisionActivityAction } from "../components/division-activity-action";
import { Button } from "../../../shared/components/button";
import { ImageField } from "../../../shared/components/image-field";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { TextField } from "../../../shared/components/text-field";
import { Surface } from "../../../shared/components/surface";
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
  type PresentationValues,
} from "../schemas/presentation-schema";
import { presentationValues } from "./presentation-values";
import { presentationEditor } from "./presentation-editor";

/** One original resource and session; background reads never replace this form's editable snapshot. */
export interface PresentationFormProps {
  presentation: Presentation;
  target: PresentationTarget;
  editing: ReturnType<typeof usePresentation>;
  disabled: boolean;
}

/** Saves one revision atomically and retains dirty fields through refusals and explicit original-target rereads. */
export function PresentationForm({
  presentation,
  target,
  editing,
  disabled,
}: PresentationFormProps) {
  const session = useAccountSession();
  const router = useRouter();
  const confirmAction = useActionConfirmation();
  const activity = useDivisionActivity(target.id ?? "");
  const creating = target.kind === "division-creation";
  const isDivision = target.kind === "division" || creating;
  const { colors } = useTheme();
  const actionFeedback = useActionFeedback();
  const mounted = useRef(false);
  const [editor] = useState(() =>
    presentationEditor(session, target, presentation),
  );
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot);
  const { baseline } = state;
  const feedback =
    state.feedback ??
    (editing.save.needsRead || activity.save.needsRead
      ? "Le résultat doit être vérifié. Relisez la présentation avant de réessayer."
      : undefined);
  const { control, handleSubmit, setError, setValue } =
    useForm<PresentationValues>({
      resolver: zodResolver(presentationSchema),
      formControl: editor.form.formControl,
    });
  const imageSelection = useImageSelection({
    canSelect: () => !editing.save.isPending(),
    onSelect: async (assets) => {
      const asset = assets[0];
      if (!asset || !session.isCurrent(session.generation)) return;
      try {
        const prepared = await prepareSportingLogo(asset, session);
        if (mounted.current && session.isCurrent(session.generation))
          editor.replaceLogo({ action: "replace", prepared });
        else deleteOwnedImage(prepared);
      } catch (error) {
        if (!(error instanceof ImageValidationError)) throw error;
        if (mounted.current && session.isCurrent(session.generation))
          setError("logo", {
            message:
              "Impossible de préparer le logo. Votre choix précédent est conservé.",
          });
      }
    },
  });
  // Read the retained control's current state on remount; RHF remains the sole submission owner.
  const { isDirty, dirtyFields } = useFormState({
    control,
  });
  useDiscardChanges(isDirty, () => {
    editor.discard();
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
  const rereadRequired =
    editing.save.needsRead || activity.save.needsRead || changed;
  const created = creating && baseline.kind === "division";
  const busy =
    disabled ||
    created ||
    imageSelection.pending ||
    editing.save.pending ||
    activity.save.pending ||
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

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Only the user's save event writes; conflicts and uncertain outcomes require a new current-state read. */
  async function submit(values: PresentationValues) {
    if (
      !mounted.current ||
      imageSelection.isPending() ||
      busy ||
      rereadRequired ||
      !session.isCurrent(session.generation)
    )
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
    if (
      creating &&
      !(await confirmAction({
        title: "Créer la division ?",
        message:
          "La nouvelle division sera active. Sa présentation ne changera jamais implicitement son activité.",
        confirmLabel: "Créer la division",
      }))
    )
      return;
    if (
      !mounted.current ||
      imageSelection.isPending() ||
      !session.isCurrent(session.generation)
    )
      return;
    editor.update({ ...state, feedback: undefined });
    const file =
      values.logo.action === "replace" ? values.logo.prepared : undefined;
    const attempt = editing.save.start({
      revision:
        baseline.kind === "division-creation" ? "" : baseline.data.revision,
      values,
    });
    if (!attempt) return;
    actionFeedback.clear();
    editor.beginUpload(file);
    try {
      const accepted = await attempt;
      if (!session.isCurrent(session.generation)) return;
      editor.update({
        baseline: accepted,
        feedback: undefined,
      });
      editor.reset(presentationValues(accepted));
      if (creating) {
        editor.discard();
      }
    } catch (error) {
      if (!session.isCurrent(session.generation)) return;
      if (requiresPresentationReread(error)) {
        editor.update({
          ...editor.getSnapshot(),
          feedback:
            "Le résultat doit être vérifié. Relisez la présentation avant de réessayer.",
        });
      } else {
        editor.update({
          ...editor.getSnapshot(),
          feedback: undefined,
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
        else if (
          isDivision &&
          error instanceof ApiError &&
          error.problem?.type === "urn:blockout:problem:conflict"
        )
          setError("name", { message: "Ce nom de division est déjà utilisé." });
        else
          actionFeedback.error(
            "L’enregistrement a été refusé. Votre brouillon est conservé.",
          );
      }
    } finally {
      editor.finishUpload(file);
    }
  }
  /** Refreshes non-dirty fields and the revision only after a successful explicit read; no write is replayed. */
  async function reread() {
    const { result, reconciled } = await editing.save.reconcile(
      [editing.queryKey],
      () => editing.query.refetch(),
      (result) => !result.isError && !!result.data,
    );
    if (
      !mounted.current ||
      imageSelection.isPending() ||
      !session.isCurrent(session.generation)
    )
      return;
    if (!reconciled || result.isError || !result.data) {
      editor.update({
        ...state,
        feedback: "La relecture a échoué. Votre brouillon est conservé.",
      });
      return;
    }
    editor.update({
      baseline: result.data,
      feedback:
        "Présentation relue. Vérifiez votre brouillon avant de l’enregistrer à nouveau.",
    });
    editor.reset(presentationValues(result.data), true);
  }
  /** Confirms and executes the separate lifecycle command against this editor's original revision. */
  async function changeActivity() {
    if (
      baseline.kind !== "division" ||
      imageSelection.isPending() ||
      editing.save.pending ||
      activity.save.pending ||
      editing.query.isFetching ||
      !activity.authority.enabled ||
      rereadRequired
    )
      return;
    const division = baseline.data;
    if (
      !(await confirmAction({
        title: `${division.active ? "Désactiver" : "Réactiver"} la division ?`,
        message: division.active
          ? "Les poules, équipes et matchs seront masqués sans effacer leur historique. La collecte s’arrêtera selon ses règles habituelles."
          : "Seule l’inactivité sera levée. Les autres restrictions de visibilité et de collecte restent applicables.",
        confirmLabel: division.active ? "Désactiver" : "Réactiver",
      }))
    )
      return;
    if (
      !mounted.current ||
      imageSelection.isPending() ||
      !session.isCurrent(session.generation)
    )
      return;
    try {
      const attempt = activity.save.start({
        revision: division.revision,
        active: !division.active,
      });
      if (!attempt) return;
      editor.update({ ...editor.getSnapshot(), feedback: undefined });
      actionFeedback.clear();
      const response = await attempt;
      if (!session.isCurrent(session.generation)) return;
      const accepted: Presentation = { kind: "division", data: response };
      editor.update({
        baseline: accepted,
        feedback: response.active
          ? "Division réactivée. Les autres restrictions restent applicables."
          : "Division désactivée. L’historique est conservé.",
      });
      editor.reset(presentationValues(accepted), true);
    } catch (error) {
      if (!session.isCurrent(session.generation)) return;
      if (requiresPresentationReread(error))
        editor.update({
          ...editor.getSnapshot(),
          feedback:
            "L’action n’a pas abouti. Relisez l’état courant avant de réessayer.",
        });
      else {
        editor.update({ ...editor.getSnapshot(), feedback: undefined });
        actionFeedback.error(
          "L’action a été refusée. Votre présentation est conservée.",
        );
      }
    }
  }
  /** Restoring is draft intent; source/LNV/club fallback is resolved by the existing binary read. */
  function restoreLogo() {
    editor.replaceLogo({ action: "automatic" });
  }
  const identity = (
    <>
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
    </>
  );
  return (
    <View style={styles.form}>
      {isDivision ? (
        <View
          style={[
            styles.context,
            styles.divisionContext,
            {
              backgroundColor: `${previewColor}14`,
              borderColor: `${previewColor}4D`,
            },
          ]}
        >
          {identity}
        </View>
      ) : (
        <Surface>
          <View style={styles.context}>{identity}</View>
        </Surface>
      )}
      <Surface>
        <View style={styles.form}>
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
              <Controller
                control={control}
                name="logo"
                render={({ fieldState }) => (
                  <ImageField
                    label={isDivision ? undefined : "Photo ou logo"}
                    images={uri ? [{ id: "logo", uri, label: "Logo" }] : []}
                    contentFit="contain"
                    disabled={busy}
                    helper="PNG/JPEG, jusqu’à 5 Mio"
                    chooseLabel="Choisir un logo"
                    replaceLabel="Changer le logo"
                    removeLabel="Rétablir le logo automatique"
                    error={fieldState.error?.message}
                    placeholderIcon={isDivision ? ImageOff : undefined}
                    onRemove={
                      !isDivision ||
                      currentLogo?.manualUrl != null ||
                      draft.action === "replace"
                        ? restoreLogo
                        : undefined
                    }
                    selection={imageSelection}
                  />
                )}
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
            render={({ field, fieldState }) => (
              <TextField
                ref={field.ref}
                label={
                  isDivision
                    ? "Nom de la division"
                    : target.kind === "club"
                      ? "Nom personnalisé"
                      : "Nom complet personnalisé"
                }
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                editable={!busy}
                error={fieldState.error?.message}
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
              render={({ field, fieldState }) => (
                <TextField
                  ref={field.ref}
                  label="Nom court personnalisé"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  editable={!busy}
                  error={fieldState.error?.message}
                  helper="Laisser vide rétablit le nom court automatique."
                />
              )}
            />
          )}
        </View>
      </Surface>
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
            imageSelection.pending ||
            editing.save.pending ||
            activity.save.pending ||
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
          loading={editing.save.executing}
          onPress={() => void handleSubmit(submit)()}
        />
      )}
      {baseline.kind === "division" &&
        !creating &&
        activity.authority.permissions?.manageDivisionLifecycle === true && (
          <DivisionActivityAction
            division={baseline.data}
            executing={activity.save.executing}
            disabled={
              imageSelection.pending ||
              editing.save.pending ||
              editing.query.isFetching ||
              rereadRequired
            }
            onPress={() => void changeActivity()}
          />
        )}
    </View>
  );
}
const styles = StyleSheet.create({
  form: { gap: tokens.spacing.lg },
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
    borderWidth: tokens.borderWidth,
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
