import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useFormik } from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";

import { spacing, typography, useAppTheme } from "@/src/shared/theme";
import type {
  ClubResponse,
  UpdateClubRequest,
} from "@/src/shared/generated/models";

import ApiErrorToast from "@/src/shared/ui/feedback/api-error-toast";

import FormCard from "@/src/shared/ui/form/form-card";
import {
  FormImageField,
  type FormImageValue,
} from "@/src/shared/ui/form/form-image-field";
import { useFormSheetBinding } from "@/src/shared/ui/form/form-sheet";
import SheetTextInput from "@/src/shared/ui/form/sheet-text-input";
import { useApis } from "@/src/shared/providers/api-provider";
import { FormField } from "@/src/shared/ui/form/form-field";

export type ClubFormProps = {
  club: ClubResponse;
  onSuccess: (updated: ClubResponse) => void;
};

const ClubForm: React.FC<ClubFormProps> = ({ club, onSuccess }) => {
  const theme = useAppTheme();
  const { mobile } = useApis();

  const [logo, setLogo] = useState<FormImageValue>({
    uri: club.logoUrl ?? null,
    upload: null,
    removed: false,
  });
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: { name: club.name ?? "" },
    validationSchema: Yup.object({
      name: Yup.string().trim().required("Nom requis"),
    }),
    onSubmit: async (values) => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        setApiError(null);

        const request: UpdateClubRequest = {
          name: values.name.trim(),
        };

        if (logo.removed) {
          request.logoUrl = null;
        } else if (club.logoUrl) {
          request.logoUrl = club.logoUrl;
        }

        const updated = await mobile.clubs.updateClub(
          club.id,
          request,
          logo.upload ?? undefined,
        );
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        onSuccess(updated);
      } catch {
        setApiError("Sauvegarde impossible, réessaie.");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
    <View style={styles.form} testID="club-form">
      <BottomSheetScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <FormImageField
          title="Logo"
          value={logo}
          fileName="club.png"
          placeholder="Ajouter un logo"
          pickAccessibilityLabel="Choisir le logo du club"
          changeLabel="Changer le logo"
          removeLabel="Supprimer le logo"
          contentFit="contain"
          onChange={setLogo}
          pickActionTestID="club-logo-picker-action"
          changeActionTestID="club-logo-change-action"
          removeActionTestID="club-logo-remove-action"
        />

        <FormCard>
          <Text style={[styles.rawName, { color: theme.text }]}>
            {club.rawName}
          </Text>
        </FormCard>

        <FormCard>
          <FormField
            label="Nom"
            error={formik.errors.name}
            touched={formik.touched.name}
          >
            <SheetTextInput
              value={formik.values.name}
              onChangeText={formik.handleChange("name")}
              onBlur={formik.handleBlur("name")}
              placeholder="Nom du club"
              accessibilityLabel="Nom du club"
              testID="club-name-input"
              returnKeyType="done"
              style={
                formik.touched.name && formik.errors.name
                  ? { borderColor: theme.error }
                  : undefined
              }
            />
          </FormField>
        </FormCard>
      </BottomSheetScrollView>

      <ApiErrorToast message={apiError} onHidden={() => setApiError(null)} />
    </View>
  );
};

export default ClubForm;

const styles = StyleSheet.create({
  form: { flex: 1 },
  scroll: {
    gap: spacing[3],
    padding: spacing[2],
    paddingBottom: spacing[16] + spacing[10],
  },
  rawName: {
    ...typography.title,
  },
});
