import { ErrorState } from "../../../shared/components/state-card";
import { ImageValidationError } from "../../../shared/images/image-validation-error";
import type { File } from "expo-file-system";
import { deleteOwnedImage } from "../../../shared/images/delete-owned-image";
import { useImageSelection } from "../../../shared/images/use-image-selection";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRound } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useFormState, useWatch } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
import {
  ApiError,
  isUncertainMutationFailure,
} from "../../../shared/api/api-fetch";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Button } from "../../../shared/components/button";
import { ImageField } from "../../../shared/components/image-field";
import { PageContent } from "../../../shared/components/page";
import {
  FormScrollView,
  type FormScrollViewProps,
} from "../../../shared/components/form-scroll-view";
import type { ScrollChromeContentProps } from "../../../shared/components/scroll-chrome";
import { ScreenState } from "../../../shared/components/screen-state";
import { ProfileLoading } from "../components/profile-loading";
import { TextField } from "../../../shared/components/text-field";
import { Surface } from "../../../shared/components/surface";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useProfileEditing, useProfilePhoto } from "../api/use-profile-editing";
import { prepareProfilePhoto } from "../profile/prepare-profile-photo";
import { profileSchema, type ProfileValues } from "../schemas/profile-schema";
import { profileValues } from "./profile-values";
import { toProfileBody } from "../api/profile-request";
import { useAccountSession } from "../session/account-session-provider";
import { useDiscardChanges } from "../../../shared/forms/use-discard-changes";

/** An editable snapshot of this original account; parent identity/generation changes remount it. */
export interface ProfileFormProps {
  /** Existing page chrome and native refresh; initial photo admission withholds the refresh control. */
  scroll: ScrollChromeContentProps;
  refreshControl: FormScrollViewProps["refreshControl"];
  account: AccountResponse;
  /** Keeps the local draft visible while the current account read cannot authorize personal edits. */
  disabled: boolean;
  /** Restores the current account if its read fails before the initial photo has admitted editing. */
  onRetryRead: () => void;
  retryingRead: boolean;
  /** Ordinary route departure; the shared dirty-form guard owns cancellation confirmation. */
  onCancel: () => void;
  /** Called only after a current acknowledged save resets the draft. */
  onSaved: () => void;
}

/** Keeps drafts through refetch/refusal and requires original-target reconciliation before an explicit uncertain retry. */
export function ProfileForm({
  scroll: { onScroll, headerHeight },
  refreshControl,
  account,
  disabled,
  onRetryRead,
  retryingRead,
  onCancel,
  onSaved,
}: ProfileFormProps) {
  const session = useAccountSession();
  const feedback = useActionFeedback();
  const { generation, isCurrent, subscribe } = session;
  const { colors } = useTheme();
  const { save, original, reread } = useProfileEditing(account.accountId);
  const active = useRef(true);
  const uploading = useRef<File | undefined>(undefined);
  const selection = useImageSelection({
    canSelect: () => !disabled && !save.isPending(),
    allowsEditing: true,
    aspect: [1, 1],
    onSelect: async (assets) => {
      const selected = assets[0];
      if (!selected) return;
      try {
        const prepared = await prepareProfilePhoto(selected, session);
        if (active.current && session.isCurrent(session.generation))
          replacePhoto({ action: "replace", prepared });
        else deleteOwnedImage(prepared);
      } catch (error) {
        if (!active.current || !session.isCurrent(session.generation)) return;
        if (error instanceof ImageValidationError)
          setError("photo", {
            message:
              "Impossible de préparer la photo. Votre choix précédent est conservé.",
          });
        else throw error;
      }
    },
  });
  const busy = selection.pending || save.pending || original.isFetching;
  const { control, handleSubmit, setValue, getValues, setError, reset } =
    useForm<ProfileValues>({
      resolver: zodResolver(profileSchema),
      defaultValues: profileValues(account),
      // RHF refreshes clean fields only after native preparation, writes and original-target reads settle.
      values: busy ? undefined : profileValues(account),
      resetOptions: {
        keepDirtyValues: true,
        keepDirty: true,
        keepErrors: true,
      },
    });
  const { isDirty, dirtyFields } = useFormState({ control });
  useDiscardChanges(isDirty, () => {
    const photo = getValues("photo");
    reset(profileValues(account), {
      keepDirtyValues: false,
      keepDirty: false,
      keepErrors: false,
    });
    if (photo.action === "replace" && photo.prepared !== uploading.current)
      deleteOwnedImage(photo.prepared);
  });
  const draft = useWatch({ control, name: "photo" });
  const photo = useProfilePhoto(
    account.accountId,
    !disabled && account.hasPhoto && draft.action === "keep",
  );
  const photoReady = !account.hasPhoto || !!photo.data;
  // This admission belongs to the original mounted draft, not to each subsequent Query status.
  const [admitted, setAdmitted] = useState(photoReady);
  if (!admitted && photoReady) setAdmitted(true);
  const uncertain = isUncertainMutationFailure(save.error);
  const needsRead = save.needsRead;
  let photoUri: string | undefined;
  if (draft.action === "replace") photoUri = draft.prepared.uri;
  else if (draft.action === "keep" && account.hasPhoto && photo.data)
    photoUri = photo.data;
  const images =
    photoUri === undefined
      ? []
      : [{ id: "profile-photo", uri: photoUri, label: "Photo de profil" }];

  useEffect(() => {
    active.current = true;
    /** Session invalidation and unmount release the draft, while a sent upload keeps its own file until settlement. */
    function releasePhoto() {
      const photo = getValues("photo");
      if (photo.action === "replace" && photo.prepared !== uploading.current)
        deleteOwnedImage(photo.prepared);
    }
    const stop = subscribe(() => {
      if (!isCurrent(generation)) releasePhoto();
    });
    return () => {
      active.current = false;
      stop();
      releasePhoto();
    };
  }, [getValues, generation, isCurrent, subscribe]);

  /** Observes the original result without replaying a write; failed rereads preserve the draft and uncertainty guard. */
  async function readOriginal() {
    feedback.clear();
    const { result, reconciled } = await reread();
    if (
      active.current &&
      session.isCurrent(session.generation) &&
      (!reconciled || result.isError)
    )
      feedback.error();
  }

  /** Transfers a prepared copy to RHF and releases the replaced draft without touching an active upload. */
  function replacePhoto(next: ProfileValues["photo"]) {
    const previous = getValues("photo");
    setValue("photo", next, { shouldDirty: true, shouldValidate: true });
    if (
      previous.action === "replace" &&
      (next.action !== "replace" || next.prepared !== previous.prepared) &&
      previous.prepared !== uploading.current
    )
      deleteOwnedImage(previous.prepared);
  }

  /** Sends supplied intent once; one original-target read may reconcile uncertainty without replay. */
  async function submit(values: ProfileValues) {
    if (
      disabled ||
      needsRead ||
      selection.isPending() ||
      !active.current ||
      !session.isCurrent(session.generation)
    )
      return;
    const file =
      values.photo.action === "replace" ? values.photo.prepared : undefined;
    feedback.clear();
    const attempt = save.start(toProfileBody(values, dirtyFields));
    if (!attempt) return;
    uploading.current = file;
    try {
      const accepted = await attempt;
      if (active.current && session.isCurrent(session.generation)) {
        reset(profileValues(accepted), {
          keepDirtyValues: false,
          keepDirty: false,
          keepErrors: false,
        });
        onSaved();
      }
    } catch (error) {
      if (!active.current || !session.isCurrent(session.generation)) return;
      if (
        error instanceof ApiError &&
        error.problem?.type === "urn:blockout:problem:username-unavailable"
      )
        setError("username", { message: "Ce pseudo est déjà utilisé." });
      else if (
        error instanceof ApiError &&
        error.problem?.type === "urn:blockout:problem:invalid-image"
      )
        setError("photo", {
          message:
            "Cette photo ne peut pas être enregistrée. Choisissez une autre image.",
        });
      else if (isUncertainMutationFailure(error)) await readOriginal();
      else feedback.error();
    } finally {
      uploading.current = undefined;
      const current = getValues("photo");
      if (
        !active.current ||
        !session.isCurrent(session.generation) ||
        current.action !== "replace" ||
        current.prepared !== file
      )
        deleteOwnedImage(file);
    }
  }

  return (
    <FormScrollView
      onScroll={onScroll}
      scrollEventThrottle={16}
      scrollIndicatorInsets={{ top: headerHeight }}
      contentContainerStyle={{ paddingTop: headerHeight }}
      refreshControl={admitted || photoReady ? refreshControl : undefined}
    >
      {!admitted && !photoReady ? (
        photo.isError || disabled ? (
          <ScreenState>
            <ErrorState
              onRetry={disabled ? onRetryRead : () => void photo.refetch()}
              retrying={retryingRead || photo.isFetching}
            />
          </ScreenState>
        ) : (
          <PageContent>
            <ProfileLoading editor />
          </PageContent>
        )
      ) : (
        <PageContent>
          <View style={styles.form}>
            <Surface>
              <View style={styles.photo}>
                <Text style={[tokens.typography.title, { color: colors.text }]}>
                  Photo de profil
                </Text>
                <Controller
                  control={control}
                  name="photo"
                  render={({ fieldState }) => (
                    <ImageField
                      images={images}
                      selection={selection}
                      placeholderIcon={UserRound}
                      disabled={disabled || busy}
                      chooseLabel="Choisir une photo de profil"
                      helper="Facultatif. PNG/JPEG, jusqu’à 5 Mio."
                      error={fieldState.error?.message}
                      onRemove={() => replacePhoto({ action: "remove" })}
                    />
                  )}
                />
              </View>
            </Surface>
            <Surface>
              <View style={styles.form}>
                <Controller
                  control={control}
                  name="username"
                  render={({ field, fieldState }) => (
                    <TextField
                      ref={field.ref}
                      label="Pseudo"
                      value={field.value}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!disabled && !busy}
                      helper="3 à 32 caractères : lettres sans accent, chiffres, point, tiret ou soulignement. Les espaces autour sont retirés."
                      error={fieldState.error?.message}
                    />
                  )}
                />
                <TextField
                  label="Adresse e-mail"
                  value={account.email}
                  readOnly
                  helper="L’adresse e-mail est liée au compte et ne peut pas être modifiée ici."
                />
              </View>
            </Surface>
            {(uncertain || needsRead) &&
              (needsRead ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[tokens.typography.body, { color: colors.text }]}
                >
                  Le résultat de la sauvegarde est incertain. Vérifiez votre
                  profil avant de réessayer.
                </Text>
              ) : (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[tokens.typography.body, { color: colors.text }]}
                >
                  Le profil a été relu. Vérifiez votre brouillon avant de
                  l’enregistrer à nouveau.
                </Text>
              ))}
            {needsRead && (
              <Button
                label="Vérifier mon profil"
                loading={original.isFetching}
                onPress={() => void readOriginal()}
              />
            )}
            <Button
              label="Enregistrer"
              fullWidth
              onPress={() => void handleSubmit(submit)()}
              disabled={!isDirty || disabled || busy || needsRead}
              loading={save.executing}
            />
            <Button
              label="Annuler"
              variant="secondary"
              fullWidth
              disabled={busy}
              onPress={onCancel}
            />
          </View>
        </PageContent>
      )}
    </FormScrollView>
  );
}
const styles = StyleSheet.create({
  form: { gap: tokens.layout.form.gap },
  photo: { gap: tokens.spacing.md },
});
