import { ImageValidationError } from "../../../shared/images/image-validation-error";
import type { File } from "expo-file-system";
import { deleteOwnedImage } from "../../../shared/images/delete-owned-image";
import { useImageSelection } from "../../../shared/images/use-image-selection";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRound } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
import {
  ApiError,
  isUncertainMutationFailure,
} from "../../../shared/api/api-fetch";
import { useActionFeedback } from "../../../shared/components/action-feedback";
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
import { useProfileEditing, useProfilePhoto } from "../api/use-profile-editing";
import { prepareProfilePhoto } from "../profile/prepare-profile-photo";
import { profileSchema, type ProfileValues } from "../forms/profile-values";
import { toProfileBody } from "../api/profile-request";
import { useAccountSession } from "../session/account-session-provider";

/** An editable snapshot of this original account; parent identity/generation changes remount it. */
export interface ProfileFormProps {
  account: AccountResponse;
}

/** Keeps drafts through refetch/refusal and requires original-target reconciliation before an explicit uncertain retry. */
export function ProfileForm({ account }: ProfileFormProps) {
  const session = useAccountSession();
  const feedback = useActionFeedback();
  const { generation, isCurrent, subscribe } = session;
  const { colors } = useTheme();
  const { save, original, reread } = useProfileEditing(account.accountId);
  const photo = useProfilePhoto(account.accountId, account.hasPhoto);
  const active = useRef(true);
  const uploading = useRef<File | undefined>(undefined);
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    setError,
    reset,
    formState: { errors, dirtyFields },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: account.username, photo: { action: "keep" } },
  });
  const selection = useImageSelection({
    canSelect: () => !save.isPending(),
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
  const draft = useWatch({ control, name: "photo" });
  const uncertain = isUncertainMutationFailure(save.error);
  const needsRead = save.needsRead;
  const busy = selection.pending || save.pending || original.isFetching;
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
      if (active.current && session.isCurrent(session.generation))
        reset({ username: accepted.username, photo: { action: "keep" } });
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
      else if (isUncertainMutationFailure(error)) await reread();
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
    <View style={styles.form}>
      <Surface>
        <View style={styles.form}>
          {draft.action === "keep" && account.hasPhoto && photo.isFetching && (
            <RequestLoading />
          )}
          {draft.action === "keep" && account.hasPhoto && photo.isError && (
            <RequestError
              message="Votre photo est indisponible."
              onRetry={() => void photo.refetch()}
              retrying={photo.isFetching}
            />
          )}
          <ImageField
            label="Photo de profil"
            images={images}
            selection={selection}
            placeholderIcon={UserRound}
            disabled={busy}
            chooseLabel="Choisir une photo de profil"
            helper="Facultatif. PNG/JPEG, jusqu’à 5 Mio."
            error={errors.photo?.message}
            onRemove={() => replacePhoto({ action: "remove" })}
          />
        </View>
      </Surface>
      <Surface>
        <View style={styles.form}>
          <Controller
            control={control}
            name="username"
            render={({ field: { value, onChange, onBlur, ref } }) => (
              <TextField
                ref={ref}
                label="Pseudo"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
                helper="3 à 32 caractères : lettres sans accent, chiffres, point, tiret ou soulignement. Les espaces autour sont retirés."
                error={errors.username?.message}
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
          <RequestError message="Le résultat de la sauvegarde est incertain. Vérifiez votre profil avant de réessayer." />
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
          onPress={() => void reread()}
        />
      )}
      <Button
        label="Enregistrer"
        onPress={() => void handleSubmit(submit)()}
        disabled={busy || needsRead}
        loading={save.executing}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  form: { gap: tokens.spacing.lg },
});
