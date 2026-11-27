import { PresentationIdentity } from "../components/presentation-identity";
import { useActionFeedback } from "@/shared/components/action-feedback";
import {
  useImageSelection,
  type ImageSelection,
} from "@/shared/images/use-image-selection";
import { ImageValidationError } from "@/shared/images/image-validation-error";
import { deleteOwnedImage } from "@/shared/images/delete-owned-image";
import { useDiscardChanges } from "@/shared/forms/use-discard-changes";
import { DivisionColorFields } from "../components/division-color-fields";
import { useEffect, useRef, type ReactNode } from "react";
import { Controller, useFormState, useWatch } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { ApiError } from "@/shared/api/api-fetch";
import { Button } from "@/shared/components/button";
import { SingleImageField } from "@/shared/components/single-image-field";
import { TextField } from "@/shared/components/text-field";
import { Surface } from "@/shared/components/surface";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { usePresentationLogo } from "../api/presentation-logo-query";
import type { Presentation, PresentationTarget } from "../api/presentation";
import type { ClubContactPatch, ClubContacts } from "../api/club-contacts";
import { copySelectedImage } from "@/shared/images/copy-selected-image";
import { type PresentationValues } from "../schemas/presentation-schema";
import { presentationValues } from "./presentation-values";
import { ClubContactFields } from "./club-contact-fields";
import { clubContactPatch } from "./club-contact-values";
import type { usePresentationDraft } from "./use-presentation-draft";

/** One original resource and session; background reads never replace this form's editable snapshot. */
export interface PresentationFormProps {
  kind: PresentationTarget["kind"];
  logoTarget?: PresentationTarget;
  onSave: (values: PresentationValues) => Promise<Presentation | undefined>;
  saving: boolean;
  editor: ReturnType<typeof usePresentationDraft>;
  disabled: boolean;
  locked?: boolean;
  clubContacts?: {
    current: ClubContacts | null | undefined;
    save: (patch: ClubContactPatch) => Promise<ClubContacts>;
  };
  activityPending?: boolean;
  beforeSave?: ReactNode;
  afterSave?: (
    imageSelection: ImageSelection,
    feedback: ReturnType<typeof useActionFeedback>,
  ) => ReactNode;
  /** Current F03 team/pool context when publicly readable; absence never blocks editing. */
  seasonLabel?: string;
  /** Known public team context refines automatic-logo copy without gating the administrative editor. */
  professionalTeam?: boolean;
}

/** Saves each edited group explicitly and keeps the draft and prepared files through ordinary refusals. */
export function PresentationForm({
  kind,
  logoTarget,
  onSave,
  saving,
  editor,
  disabled,
  locked = false,
  clubContacts,
  activityPending = false,
  beforeSave,
  afterSave,
  seasonLabel,
  professionalTeam,
}: Readonly<PresentationFormProps>) {
  const isDivision = kind === "division";
  const { colors } = useTheme();
  const actionFeedback = useActionFeedback();
  const mounted = useRef(false);
  const state = editor.state;
  const baseline = state.baseline;
  const feedback = state.feedback;
  const { control, handleSubmit, setError, setValue } = editor.form;
  const imageSelection = useImageSelection({
    mode: "crop",
    canSelect: () => !disabled && !locked && !saving && !activityPending,
    onSelect: async ([asset]) => {
      try {
        const prepared = await copySelectedImage(asset);
        if (mounted.current) {
          editor.replaceLogo({ action: "replace", prepared });
        } else {
          deleteOwnedImage(prepared);
        }
      } catch (error) {
        if (!(error instanceof ImageValidationError)) {
          throw error;
        }
        if (mounted.current) {
          setError("logo", {
            message: "Choisissez une image PNG ou JPEG de 5 Mio maximum.",
          });
        }
      }
    },
  });
  // RHF owns this mounted route's fields and dirty state.
  const { isDirty, dirtyFields, isSubmitting } = useFormState({
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
  const selectedLogo =
    dirtyFields.logo !== undefined && draft.action === "replace";
  const unavailable =
    disabled || locked || imageSelection.pending || saving || activityPending;
  const busy = unavailable || isSubmitting;
  const { logo: currentLogo, title, names } = presentationContext(baseline);
  const selection = draft.action === "automatic" ? "automatic" : "effective";
  const remoteUrl =
    draft.action === "automatic"
      ? currentLogo?.automaticUrl
      : currentLogo?.effectiveUrl;
  const hasLogo = logoTarget !== undefined && remoteUrl != null;
  const artwork = usePresentationLogo(
    logoTarget,
    selection,
    hasLogo && draft.action !== "replace",
  );
  let uri: string | undefined;
  if (draft.action === "replace") {
    uri = draft.prepared.uri;
  } else if (hasLogo) {
    uri = artwork?.data ?? undefined;
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /** Only an explicit save writes; ordinary errors preserve mounted input for refresh or retry. */
  async function submit(values: PresentationValues) {
    if (!mounted.current || imageSelection.isPending() || unavailable) {
      return;
    }
    editor.update({ ...state, feedback: undefined });
    const file =
      values.logo.action === "replace" ? values.logo.prepared : undefined;
    actionFeedback.clear();
    editor.beginUpload(file);
    try {
      if (baseline?.kind === "club") {
        await saveClub(values, baseline);
        return;
      }
      const accepted = await onSave(values);
      if (accepted && mounted.current) {
        acceptPresentation(accepted);
      }
    } catch (error) {
      if (mounted.current) {
        handleSaveError(error);
      }
    } finally {
      editor.finishUpload(file);
    }
  }

  /** Keeps an acknowledged presentation if only the subsequent contact write fails. */
  async function saveClub(
    values: PresentationValues,
    original: Extract<Presentation, { kind: "club" | "team" }>,
  ) {
    if (!clubContacts?.current || !values.contacts) {
      return;
    }
    const patch = clubContactPatch(values.contacts, clubContacts.current);
    let accepted: Presentation | undefined;
    if (dirtyFields.name || values.logo.action !== "keep") {
      const { sourceName, manualName } = original.data.names;
      const name = dirtyFields.name ? values.name : (manualName ?? "");
      accepted = await onSave({
        ...values,
        name: dirtyFields.name && name.trim() === sourceName ? "" : name,
      });
      if (!accepted || !mounted.current) {
        return;
      }
    }

    try {
      if (Object.keys(patch).length > 0) {
        await clubContacts.save(patch);
      }
    } catch (error) {
      if (!accepted) {
        throw error;
      }
      if (mounted.current) {
        acceptPresentation(accepted);
        setValue("contacts", values.contacts, { shouldDirty: true });
        actionFeedback.error(
          "La présentation a été enregistrée. L’enregistrement des coordonnées n’a pas pu être confirmé.",
        );
      }
      return;
    }

    if (!mounted.current) {
      return;
    }
    if (accepted) {
      acceptPresentation(accepted);
    } else {
      editor.reset(presentationValues(original));
    }
  }

  function acceptPresentation(accepted: Presentation) {
    editor.update({ baseline: accepted });
    editor.reset(presentationValues(accepted));
  }

  /** Preserves the draft and reports image or name corrections at their field; other failures use ordinary feedback. */
  function handleSaveError(error: unknown) {
    if (
      error instanceof ApiError &&
      (error.problem?.type === "urn:blockout:problem:invalid-image" ||
        error.status === 413)
    ) {
      setError("logo", {
        message:
          "Ce logo ne peut pas être enregistré. Choisissez une autre image.",
      });
    } else if (
      isDivision &&
      error instanceof ApiError &&
      error.problem?.type === "urn:blockout:problem:conflict"
    ) {
      setError("name", { message: "Ce nom de division est déjà utilisé." });
    } else {
      actionFeedback.error();
    }
  }

  /** Restoring is draft intent; source/LNV/club fallback is resolved by the existing binary read. */
  function restoreLogo() {
    editor.replaceLogo({ action: "automatic" });
  }

  const sourceNameSuffix = names?.sourceName ? ` : ${names.sourceName}` : "";
  const nameHelper =
    kind === "club"
      ? (names?.sourceName ?? undefined)
      : names
        ? `Laisser vide rétablit le nom automatique${sourceNameSuffix}.`
        : undefined;

  /** Presents draft, conflict and lifecycle actions against the existing mounted form owners. */
  function renderActions() {
    return (
      <>
        {isDirty && (
          <Text
            style={[
              tokens.typography.metadata,
              { color: colors.secondaryText },
            ]}
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
        {beforeSave}
        {(!disabled || !isDivision) && (
          <Button
            label="Enregistrer"
            fullWidth
            disabled={busy}
            loading={saving || isSubmitting}
            onPress={() => void handleSubmit(submit)()}
          />
        )}
        {afterSave?.(imageSelection, actionFeedback)}
      </>
    );
  }

  const logoPending =
    draft.action !== "replace" && hasLogo && artwork?.isLoading === true;
  const identity = (
    <PresentationIdentity
      uri={uri}
      loading={logoPending}
      isDivision={isDivision}
      name={draftName}
      title={title}
      seasonLabel={seasonLabel}
      color={previewColor}
      gradient={draftGradient}
    />
  );
  return (
    <View style={styles.form}>
      {isDivision ? (
        <View
          style={[
            styles.context,
            styles.divisionContext,
            {
              backgroundColor: `${previewColor}${colors.sportingSurfaceAlpha}`,
              borderColor: `${previewColor}${colors.contextBorderAlpha}`,
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
          {kind !== "pool" && (
            <Controller
              control={control}
              name="logo"
              render={({ fieldState }) => {
                /** Distinguishes restoring a known club fallback from removing another manual logo. */
                function logoResetLabel() {
                  if (kind === "team") {
                    if (professionalTeam === false) {
                      return "Rétablir le logo du club";
                    }
                    return "Rétablir le logo automatique";
                  }
                  return "Retirer le logo personnalisé";
                }

                return (
                  <SingleImageField
                    label="Logo"
                    image={uri ? { id: "logo", uri, label: "Logo" } : undefined}
                    readRevision={
                      draft.action !== "replace"
                        ? artwork?.dataUpdatedAt
                        : undefined
                    }
                    hasImage={draft.action === "replace" || hasLogo}
                    loading={logoPending}
                    disabled={busy}
                    helper="PNG/JPEG - 5 Mio maximum"
                    addLabel="Ajouter un logo"
                    editLabel="Modifier le logo"
                    chooseLabel="Choisir un logo"
                    removeLabel={logoResetLabel()}
                    error={fieldState.error?.message}
                    onRemove={
                      selectedLogo ||
                      (draft.action === "keep" &&
                        currentLogo?.manualUrl != null)
                        ? restoreLogo
                        : undefined
                    }
                    selection={imageSelection}
                  />
                );
              }}
            />
          )}
          <Controller
            control={control}
            name="name"
            render={({ field, fieldState }) => {
              /** Uses the existing resource-specific name field wording. */
              function nameFieldLabel() {
                if (isDivision) {
                  return "Nom de la division";
                }
                return "Nom complet personnalisé";
              }

              return (
                <TextField
                  ref={field.ref}
                  label={nameFieldLabel()}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  editable={!busy}
                  error={fieldState.error?.message}
                  helper={nameHelper}
                />
              );
            }}
          />
          {(kind === "team" || kind === "pool") && (
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
      {clubContacts?.current && (
        <ClubContactFields
          form={editor.form}
          current={clubContacts.current}
          disabled={busy}
        />
      )}
      {isDivision && (
        <DivisionColorFields
          control={control}
          setValue={setValue}
          disabled={busy}
        />
      )}
      {renderActions()}
    </View>
  );
}

/** Projects known names and artwork from the draft baseline. An empty division starts with its own preview title. */
function presentationContext(baseline?: Presentation) {
  if (!baseline) {
    return {
      title: "Nouvelle division",
      logo: undefined,
      names: undefined,
    };
  }
  if (baseline.kind === "division") {
    return {
      title: baseline.data.name,
      logo: baseline.data.logo,
      names: undefined,
    };
  }
  return {
    title: baseline.data.names.effectiveName,
    names: baseline.data.names,
    logo: baseline.kind === "pool" ? undefined : baseline.data.logo,
  };
}

const styles = StyleSheet.create({
  form: { gap: tokens.layout.form.gap },
  context: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.md,
  },
  divisionContext: {
    padding: tokens.spacing.compact,
    borderRadius: tokens.radius.control,
    borderWidth: tokens.border.thin,
  },
});
