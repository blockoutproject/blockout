import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useFormik } from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";

import { spacing, typography, useAppTheme } from "@/src/shared/theme";
import type {
  TeamDetailsResponse,
  TeamResponse,
  UpdateTeamRequest,
} from "@/src/shared/generated/models";

import ApiErrorToast from "@/src/shared/ui/feedback/api-error-toast";

import FormCard from "@/src/shared/ui/form/form-card";
import { FormField } from "@/src/shared/ui/form/form-field";
import {
  FormImageField,
  type FormImageValue,
} from "@/src/shared/ui/form/form-image-field";
import { useFormSheetBinding } from "@/src/shared/ui/form/form-sheet";
import { useApis } from "@/src/shared/providers/api-provider";
import SheetTextInput from "@/src/shared/ui/form/sheet-text-input";

export type TeamFormProps = {
  team: TeamResponse;
  onSuccess: (updated: TeamDetailsResponse) => void;
};

const TeamForm: React.FC<TeamFormProps> = ({ team, onSuccess }) => {
  const theme = useAppTheme();
  const { mobile } = useApis();

  const [logo, setLogo] = useState<FormImageValue>({
    uri: team.logoUrl ?? null,
    upload: null,
    removed: false,
  });
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      name: team.name ?? "",
      shortName: team.shortName ?? "",
    },
    validationSchema: Yup.object({
      name: Yup.string().trim().required("Nom requis"),
      shortName: Yup.string().trim().required("Diminutif requis"),
    }),
    onSubmit: async (values) => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        setApiError(null);

        const request: UpdateTeamRequest = {
          name: values.name.trim(),
          shortName: values.shortName.trim(),
        };

        if (logo.removed) {
          request.logoUrl = null;
        } else if (team.logoUrl) {
          request.logoUrl = team.logoUrl;
        }

        const updated = await mobile.teams.updateTeam(
          team.id,
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
    <View style={styles.form} testID="team-form">
      <BottomSheetScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <FormImageField
          title="Logo"
          value={logo}
          fileName="team.png"
          placeholder="Ajouter un logo"
          pickAccessibilityLabel="Choisir le logo de l'équipe"
          changeLabel="Changer le logo"
          removeLabel="Supprimer le logo"
          contentFit="contain"
          onChange={setLogo}
          pickActionTestID="team-logo-picker-action"
          changeActionTestID="team-logo-change-action"
          removeActionTestID="team-logo-remove-action"
        />

        <FormCard>
          <Text style={[styles.rawName, { color: theme.text }]}>
            {team.rawName}
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
              placeholder="Nom de l'équipe"
              accessibilityLabel="Nom de l'équipe"
              testID="team-name-input"
              returnKeyType="done"
              style={
                formik.touched.name && formik.errors.name
                  ? { borderColor: theme.error }
                  : undefined
              }
            />
          </FormField>
        </FormCard>

        <FormCard>
          <FormField
            label="Diminutif"
            error={formik.errors.shortName}
            touched={formik.touched.shortName}
          >
            <SheetTextInput
              value={formik.values.shortName}
              onChangeText={formik.handleChange("shortName")}
              onBlur={formik.handleBlur("shortName")}
              placeholder="Diminutif de l'équipe"
              accessibilityLabel="Diminutif de l'équipe"
              testID="team-short-name-input"
              returnKeyType="done"
              style={
                formik.touched.shortName && formik.errors.shortName
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

export default TeamForm;

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
