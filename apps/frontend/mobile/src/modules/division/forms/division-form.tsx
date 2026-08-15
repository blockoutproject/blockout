import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useFormik } from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import {
  iconSize,
  borderWidth,
  fontWeight,
  radius,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import {
  DivisionResponse,
  UpsertDivisionRequest,
} from "@/src/shared/generated/models";
import CircleColorPicker from "@/src/modules/division/ui/circle-color-picker";

import ApiErrorToast from "@/src/shared/ui/feedback/api-error-toast";

import FormCard from "@/src/shared/ui/form/form-card";
import { FormField } from "@/src/shared/ui/form/form-field";
import { useFormSheetBinding } from "@/src/shared/ui/form/form-sheet";
import SheetTextInput from "@/src/shared/ui/form/sheet-text-input";
import { useApis } from "@/src/shared/providers/api-provider";
import { ImageUpload } from "@/src/shared/api/image-upload";

export type DivisionFormProps = {
  division: DivisionResponse | null;
  onSuccess: () => void;
};

const DivisionForm: React.FC<DivisionFormProps> = ({ division, onSuccess }) => {
  const theme = useAppTheme();
  const { mobile } = useApis();

  const [imageFile, setImageFile] = useState<ImageUpload | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const handlePickImage = async () => {
    try {
      await Haptics.selectionAsync();
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
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
        format: ImageManipulator.SaveFormat.JPEG,
        compress: 1,
      });
      setPreviewUri(saved.uri);
      setImageFile({
        uri: saved.uri,
        name: "division.jpg",
        type: "image/jpeg",
      });
    } catch {
      Alert.alert("Erreur", "Impossible de traiter l'image.");
    }
  };

  const formik = useFormik({
    initialValues: {
      name: division?.name ?? "",
      mainColor: division?.mainColor ?? "",
      firstGradientColor: division?.firstGradientColor ?? "",
      secondGradientColor: division?.secondGradientColor ?? "",
      thirdGradientColor: division?.thirdGradientColor ?? "",
      logoUrl: division?.logoUrl ?? "",
    },
    validationSchema: Yup.object({
      name: Yup.string().trim().required("Le nom est requis"),
      mainColor: Yup.string().trim().required("Couleur principale requise"),
      firstGradientColor: Yup.string()
        .trim()
        .required("Première couleur de dégradé requise"),
      secondGradientColor: Yup.string()
        .trim()
        .required("Deuxième couleur de dégradé requise"),
      thirdGradientColor: Yup.string()
        .trim()
        .required("Troisième couleur de dégradé requise"),
    }),
    onSubmit: async (values) => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        setApiError(null);
        const request: UpsertDivisionRequest = {
          name: values.name.trim(),
          mainColor: values.mainColor.trim(),
          firstGradientColor: values.firstGradientColor.trim(),
          secondGradientColor: values.secondGradientColor.trim(),
          thirdGradientColor: values.thirdGradientColor.trim(),
        };
        if (division) {
          await mobile.divisions.updateDivision(
            division.id,
            request,
            imageFile ?? undefined,
          );
        } else {
          await mobile.divisions.createDivision(
            request,
            imageFile ?? undefined,
          );
        }
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        onSuccess();
      } catch {
        setApiError("La sauvegarde a échoué. Veuillez réessayer.");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoading(false);
      }
    },
  });

  const canSubmit = formik.isValid && !loading;
  const footerGradient = useMemo(
    () =>
      formik.values.mainColor
        ? ([
            formik.values.mainColor,
            formik.values.mainColor,
            formik.values.mainColor,
          ] as const)
        : undefined,
    [formik.values.mainColor],
  );

  useFormSheetBinding({
    submit: formik.submitForm,
    loading,
    canSubmit,
    gradient: footerGradient,
  });

  const logoUri = previewUri ?? formik.values.logoUrl ?? null;

  return (
    <>
      <BottomSheetScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        testID="division-form"
      >
        <FormCard title="Logo">
          <TouchableOpacity
            onPress={handlePickImage}
            activeOpacity={0.85}
            style={[styles.logoWrap, { borderColor: theme.border }]}
            accessibilityRole="button"
            accessibilityLabel="Choisir un logo de division"
            testID="division-logo-action"
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
                    size={iconSize.navigation}
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
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePickImage}
            style={[
              styles.logoBtn,
              { backgroundColor: theme.backgroundSecondary },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Changer le logo"
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={iconSize.sm}
              color={theme.text}
            />
            <Text style={[styles.logoBtnText, { color: theme.text }]}>
              Changer le logo
            </Text>
          </TouchableOpacity>
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
              placeholder="Nom de la division"
              accessibilityLabel="Nom de la division"
              style={
                formik.touched.name && formik.errors.name
                  ? { borderColor: theme.error }
                  : undefined
              }
            />
          </FormField>
        </FormCard>

        <FormCard title="Couleur principale">
          <View style={styles.colorRow}>
            <CircleColorPicker
              value={formik.values.mainColor}
              onChange={(c) => formik.setFieldValue("mainColor", c)}
            />
          </View>
        </FormCard>

        <FormCard title="Dégradé">
          <View style={styles.colorRow}>
            <CircleColorPicker
              value={formik.values.firstGradientColor}
              onChange={(c) => formik.setFieldValue("firstGradientColor", c)}
            />
            <CircleColorPicker
              value={formik.values.secondGradientColor}
              onChange={(c) => formik.setFieldValue("secondGradientColor", c)}
            />
            <CircleColorPicker
              value={formik.values.thirdGradientColor}
              onChange={(c) => formik.setFieldValue("thirdGradientColor", c)}
            />
          </View>
        </FormCard>
      </BottomSheetScrollView>

      <ApiErrorToast message={apiError} onHidden={() => setApiError(null)} />
    </>
  );
};

export default DivisionForm;

const styles = StyleSheet.create({
  scroll: { gap: spacing[3], padding: spacing[2], paddingBottom: 100 },
  logoWrap: {
    borderWidth: borderWidth.subtle,
    borderRadius: radius.panel,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoMask: {
    width: 100,
    aspectRatio: 1,
    borderRadius: radius.hero,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: spacing[4],
  },
  logo: { width: "100%", height: "100%" },
  logoPlaceholder: { alignItems: "center", gap: spacing.tight },
  logoHint: {
    fontSize: typography.metadata.fontSize,
    fontWeight: fontWeight.semiBold,
  },
  logoBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: spacing.tight,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
  logoBtnText: {
    fontSize: typography.metadata.fontSize,
    fontWeight: fontWeight.bold,
  },
  colorRow: {
    flexDirection: "row",
    gap: spacing[4],
    marginTop: spacing[2],
    marginLeft: spacing[2],
  },
});
