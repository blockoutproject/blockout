import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useFormik } from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";

import { spacing, useAppTheme } from "@/src/shared/theme";

import { UserResponse, UpdateUserRequest } from "@/src/shared/generated/models";
import ApiErrorToast from "@/src/shared/ui/feedback/api-error-toast";

import FormCard from "@/src/shared/ui/form/form-card";
import { FormField } from "@/src/shared/ui/form/form-field";
import {
  FormImageField,
  type FormImageValue,
} from "@/src/shared/ui/form/form-image-field";
import { useFormSheetBinding } from "@/src/shared/ui/form/form-sheet";
import SheetTextInput from "@/src/shared/ui/form/sheet-text-input";
import { useApis } from "@/src/shared/providers/api-provider";
import { ApiError } from "@/src/shared/api/api-error";

export type UserFormProps = {
  user: UserResponse;
  onSuccess: (updated: UserResponse) => void;
};

const ProfileForm: React.FC<UserFormProps> = ({ user, onSuccess }) => {
  const theme = useAppTheme();
  const { mobile } = useApis();

  const [avatar, setAvatar] = useState<FormImageValue>({
    uri: user.pictureUrl ?? null,
    upload: null,
    removed: false,
  });
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: { pseudo: user.pseudo ?? "" },
    validationSchema: Yup.object({
      pseudo: Yup.string()
        .required("Je s'appelle Groot 🌳")
        .min(3, "Min. 3 caractères")
        .max(32, "Max. 32 caractères")
        .matches(/^[a-zA-Z0-9._-]+$/, "Lettres, chiffres, ., -, _ uniquement"),
    }),
    onSubmit: async (values) => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        setApiError(null);

        const request: UpdateUserRequest = {};
        const trimmed = values.pseudo.trim();
        if (trimmed && trimmed !== user.pseudo) request.pseudo = trimmed;

        if (avatar.removed) {
          request.pictureUrl = null;
        } else if (!avatar.upload && user.pictureUrl) {
          request.pictureUrl = user.pictureUrl;
        }

        const updated = await mobile.users.updateUser(
          user.auth0Id,
          request,
          avatar.upload ?? undefined,
        );
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        onSuccess(updated);
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          const errorData = err.data as
            { message?: unknown; error?: unknown } | undefined;
          const serverMsg =
            (typeof errorData?.message === "string" && errorData.message) ||
            (typeof errorData?.error === "string" && errorData.error) ||
            "Ce pseudo est déjà utilisé.";
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error,
          );
          formik.setFieldError("pseudo", serverMsg);
          setApiError(null);
        } else {
          setApiError("Sauvegarde impossible, réessaie.");
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Error,
          );
        }
      } finally {
        setLoading(false);
      }
    },
  });

  const canSubmit = formik.isValid && !loading;
  useFormSheetBinding({
    submit: formik.submitForm,
    loading,
    canSubmit,
  });

  return (
    <>
      <BottomSheetScrollView
        contentContainerStyle={styles.fieldContainer}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
        testID="profile-form"
      >
        <FormImageField
          title="Photo de profil"
          value={avatar}
          fileName="avatar.png"
          placeholder="Ajouter une photo"
          pickAccessibilityLabel="Choisir une photo de profil"
          changeLabel="Changer la photo"
          removeLabel="Supprimer la photo"
          contentFit="cover"
          onChange={setAvatar}
          pickActionTestID="profile-photo-action"
          changeActionTestID="profile-photo-change-action"
          removeActionTestID="profile-photo-remove-action"
        />

        <FormCard>
          <FormField
            label="Pseudo"
            error={formik.errors.pseudo}
            touched={formik.touched.pseudo}
          >
            <SheetTextInput
              value={formik.values.pseudo}
              onChangeText={formik.handleChange("pseudo")}
              onBlur={formik.handleBlur("pseudo")}
              placeholder="Ton pseudo"
              autoCapitalize="none"
              returnKeyType="done"
              style={
                formik.touched.pseudo && formik.errors.pseudo
                  ? { borderColor: theme.error }
                  : undefined
              }
            />
          </FormField>
        </FormCard>
      </BottomSheetScrollView>

      <ApiErrorToast message={apiError} onHidden={() => setApiError(null)} />
    </>
  );
};

export default ProfileForm;

const styles = StyleSheet.create({
  fieldContainer: {
    gap: spacing[3],
    padding: spacing[2],
    paddingBottom: spacing[16] + spacing[10],
  },
});
