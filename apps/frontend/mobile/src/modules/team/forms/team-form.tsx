import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useFormik } from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { radius, useAppTheme } from "@/src/shared/theme";
import type {
  TeamDetailsResponse,
  TeamResponse,
  UpdateTeamRequest,
} from "@/src/shared/generated/models";

import ApiErrorToast from "@/src/shared/ui/feedback/api-error-toast";

import FormCard from "@/src/shared/ui/form/form-card";
import { FormField } from "@/src/shared/ui/form/form-field";
import { useApis } from "@/src/shared/providers/api-provider";
import { ImageUpload } from "@/src/shared/api/image-upload";
import SheetTextInput from "@/src/shared/ui/form/sheet-text-input";

export type TeamFormState = {
  loading: boolean;
  canSubmit: boolean;
};

export type TeamFormProps = {
  team: TeamResponse;
  onSuccess: (updated: TeamDetailsResponse) => void;
  onRegisterSubmit: (submit: () => void) => void;
  onStateChange?: (state: TeamFormState) => void;
};

const TeamForm: React.FC<TeamFormProps> = ({
  team,
  onSuccess,
  onRegisterSubmit,
  onStateChange,
}) => {
  const theme = useAppTheme();
  const { mobile } = useApis();

  const [imageFile, setImageFile] = useState<ImageUpload | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [removedLogo, setRemovedLogo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handlePickImage = async () => {
    try {
      await Haptics.selectionAsync();
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"] as unknown as ImagePicker.MediaTypeOptions,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (pickerResult.canceled) return;

      const selected = pickerResult.assets[0];
      if (!selected?.uri) return;

      const manipContext = ImageManipulator.ImageManipulator.manipulate(
        selected.uri,
      );
      manipContext.resize({ width: 512 });
      const rendered = await manipContext.renderAsync();
      const saved = await rendered.saveAsync({
        format: ImageManipulator.SaveFormat.PNG,
        compress: 1,
      });

      setPreviewUri(saved.uri);
      setImageFile({ uri: saved.uri, name: "team.png", type: "image/png" });
      setRemovedLogo(false);
    } catch {
      Alert.alert("Erreur", "Impossible de traiter l’image.");
    }
  };

  const handleRemoveImage = async () => {
    await Haptics.selectionAsync();
    setPreviewUri(null);
    setImageFile(null);
    setRemovedLogo(true);
  };

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

        if (removedLogo) {
          request.logoUrl = null;
        } else if (team.logoUrl) {
          request.logoUrl = team.logoUrl;
        }

        const updated = await mobile.teams.updateTeam(
          team.id,
          request,
          imageFile ?? undefined,
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

  useEffect(() => {
    onRegisterSubmit(formik.submitForm);
  }, [formik.submitForm, onRegisterSubmit]);

  const canSubmit = useMemo(
    () => formik.isValid && !loading,
    [formik.isValid, loading],
  );

  useEffect(() => {
    onStateChange?.({ loading, canSubmit });
  }, [loading, canSubmit, onStateChange]);

  const logoUri = removedLogo ? null : (previewUri ?? team.logoUrl ?? null);

  return (
    <View style={styles.form} testID="team-form">
      <BottomSheetScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <FormCard title="Logo">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choisir le logo de l'équipe"
            onPress={handlePickImage}
            style={({ pressed }) => [
              styles.logoWrap,
              { borderColor: theme.border },
              pressed ? styles.pressed : undefined,
            ]}
            testID="team-logo-picker-action"
          >
            <View style={styles.logoMask}>
              {logoUri ? (
                <Image
                  source={{ uri: logoUri }}
                  style={styles.logo}
                  contentFit="contain"
                />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <MaterialCommunityIcons
                    name="camera-plus-outline"
                    size={28}
                    color={theme.textInactive}
                  />
                  <Text
                    style={[styles.logoHint, { color: theme.textInactive }]}
                  >
                    Ajouter un logo
                  </Text>
                </View>
              )}
            </View>
          </Pressable>

          <View style={styles.buttonsRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Changer le logo"
              onPress={handlePickImage}
              style={({ pressed }) => [
                styles.logoBtn,
                { backgroundColor: theme.backgroundSecondary },
                pressed ? styles.pressed : undefined,
              ]}
              testID="team-logo-change-action"
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={16}
                color={theme.text}
              />
              <Text style={[styles.logoBtnText, { color: theme.text }]}>
                Changer le logo
              </Text>
            </Pressable>

            {!!logoUri && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Supprimer le logo"
                onPress={handleRemoveImage}
                style={({ pressed }) => [
                  styles.removeBtn,
                  { backgroundColor: theme.backgroundSecondary },
                  pressed ? styles.pressed : undefined,
                ]}
                testID="team-logo-remove-action"
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={16}
                  color={theme.error}
                />
                <Text style={[styles.removeBtnText, { color: theme.error }]}>
                  Supprimer
                </Text>
              </Pressable>
            )}
          </View>
        </FormCard>

        <FormCard>
          <Text style={{ color: theme.text, fontWeight: "900" }}>
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
  scroll: { gap: 12, padding: 8, paddingBottom: 100 },
  logoWrap: {
    borderWidth: 1.5,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoMask: {
    width: 110,
    aspectRatio: 1,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16,
  },
  logo: { width: "100%", height: "100%" },
  logoPlaceholder: { alignItems: "center", gap: 6 },
  logoHint: { fontSize: 12, fontWeight: "600" },
  logoBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  logoBtnText: { fontSize: 12, fontWeight: "700" },
  removeBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
  },
  removeBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  pressed: { opacity: 0.7 },
});
