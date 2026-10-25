import type { File } from "expo-file-system";
import { deletePreparedImage } from "../../../shared/images/delete-prepared-image";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRound } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import type { AccountResponse } from "../../../../.generated/schemas/index.zod";
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
  const { generation, isCurrent, subscribe } = session;
  const { colors } = useTheme();
  const { save, original } = useProfileEditing(account.accountId);
  const photo = useProfilePhoto(account.accountId, account.hasPhoto);
  const active = useRef(true);
  const uploading = useRef<File | undefined>(undefined);
  const [preparing, setPreparing] = useState(false);
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    setError,
    reset,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: account.username, photo: { action: "keep" } },
  });
  const draft = useWatch({ control, name: "photo" });
  const uncertain = isUncertainMutationFailure(save.error);
  const needsRead = uncertain && !original.isSuccess;
  const busy = preparing || isSubmitting || original.isFetching;
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
        deletePreparedImage(photo.prepared);
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
      deletePreparedImage(previous.prepared);
  }

  /** Sends only supplied editing intent; an uncertain failure performs one read without replaying the write. */
  async function submit(values: ProfileValues) {
    if (
      needsRead ||
      preparing ||
      !active.current ||
      !session.isCurrent(session.generation)
    )
      return;
    const file =
      values.photo.action === "replace" ? values.photo.prepared : undefined;
    uploading.current = file;
    try {
      const accepted = await save.mutateAsync(
        toProfileBody(values, dirtyFields),
      );
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
      if (isUncertainMutationFailure(error)) await original.refetch();
    } finally {
      uploading.current = undefined;
      const current = getValues("photo");
      if (
        !active.current ||
        !session.isCurrent(session.generation) ||
        current.action !== "replace" ||
        current.prepared !== file
      )
        deletePreparedImage(file);
    }
  }

  return (
    <View style={styles.form}>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
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
          allowsEditing
          placeholderIcon={UserRound}
          aspect={[1, 1]}
          disabled={busy}
          chooseLabel="Choisir une photo de profil"
          helper="Facultatif. PNG/JPEG, jusqu’à 5 Mio."
          error={errors.photo?.message}
          onRemove={() => replacePhoto({ action: "remove" })}
          onSelect={async (assets) => {
            const selected = assets[0];
            if (!selected) return;
            setPreparing(true);
            try {
              const prepared = await prepareProfilePhoto(selected, session);
              if (active.current && session.isCurrent(session.generation))
                replacePhoto({ action: "replace", prepared });
              else deletePreparedImage(prepared);
            } catch {
              if (active.current && session.isCurrent(session.generation))
                setError("photo", {
                  message:
                    "Impossible de préparer la photo. Votre choix précédent est conservé.",
                });
            } finally {
              if (active.current && session.isCurrent(session.generation))
                setPreparing(false);
            }
          }}
        />
      </View>
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
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
      {save.isError && !uncertain && (
        <RequestError message="Votre profil n’a pas pu être enregistré. Votre brouillon est conservé." />
      )}
      {uncertain &&
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
          onPress={() => void original.refetch()}
        />
      )}
      {save.isSuccess && (
        <Text
          accessibilityLiveRegion="polite"
          style={[tokens.typography.body, { color: colors.text }]}
        >
          Profil enregistré.
        </Text>
      )}
      <Button
        label="Enregistrer"
        onPress={() => void handleSubmit(submit)()}
        disabled={busy || needsRead}
        loading={isSubmitting}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  form: { gap: tokens.spacing.lg },
  card: {
    gap: tokens.spacing.lg,
    padding: tokens.spacing.lg,
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
  },
});
