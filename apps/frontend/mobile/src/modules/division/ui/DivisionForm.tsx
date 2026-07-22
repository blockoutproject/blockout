import React, {useEffect, useMemo, useState} from "react";
import {Alert, StyleSheet, Text, TouchableOpacity, View} from "react-native";
import {BottomSheetScrollView} from "@gorhom/bottom-sheet";
import {useFormik} from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import {Image} from "expo-image";
import {MaterialCommunityIcons} from "@expo/vector-icons";

import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {DivisionResponse, UpsertDivisionRequest} from "@/src/shared/generated/models";
import CircleColorPicker from "@/src/shared/ui/form/CircleColorPicker";
import {CORNERS} from "@/src/shared/theme/tokens";
import ApiErrorToast from "@/src/shared/ui/feedback/ApiErrorToast";

import FormCard from "@/src/shared/ui/form/FormCard";
import Field from "@/src/shared/ui/form/Field";
import SheetTextInput from "@/src/shared/ui/form/SheetTextInput";
import {useApis} from "@/src/shared/providers/ApiProvider";
import {ImageUpload} from "@/src/shared/model/ImageUpload";

export type DivisionFormState = {
  loading: boolean;
  canSubmit: boolean;
  accentColor?: string;
};

export type DivisionFormProps = {
  division: DivisionResponse | null;
  onSuccess: () => void;
  onRegisterSubmit: (submit: () => void) => void;
  onStateChange?: (state: DivisionFormState) => void;
};

const DivisionForm: React.FC<DivisionFormProps> = ({division, onSuccess, onRegisterSubmit, onStateChange}) => {
  const theme = useAppTheme();
  const {mobile} = useApis();

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
      const manipContext = ImageManipulator.ImageManipulator.manipulate(selected.uri);
      manipContext.resize({width: 512});
      const rendered = await manipContext.renderAsync();
      const saved = await rendered.saveAsync({format: ImageManipulator.SaveFormat.JPEG, compress: 1});
      setPreviewUri(saved.uri);
      setImageFile({uri: saved.uri, name: "division.jpg", type: "image/jpeg"});
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
      firstGradientColor: Yup.string().trim().required("Première couleur de dégradé requise"),
      secondGradientColor: Yup.string().trim().required("Deuxième couleur de dégradé requise"),
      thirdGradientColor: Yup.string().trim().required("Troisième couleur de dégradé requise"),
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
          await mobile.config.updateDivision(division.id, request, imageFile ?? undefined);
        } else {
          await mobile.config.createDivision(request, imageFile ?? undefined);
        }
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess();
      } catch {
        setApiError("La sauvegarde a échoué. Veuillez réessayer.");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoading(false);
      }
    },
  });

  useEffect(() => {
    onRegisterSubmit(formik.submitForm);
  }, [formik.submitForm, onRegisterSubmit]);

  const canSubmit = useMemo(() => formik.isValid && !loading, [formik.isValid, loading]);

  useEffect(() => {
    onStateChange?.({loading, canSubmit, accentColor: formik.values.mainColor || undefined});
  }, [loading, canSubmit, formik.values.mainColor, onStateChange]);

  const logoUri = previewUri ?? formik.values.logoUrl ?? null;

  return (
    <>
      <BottomSheetScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        testID="division-form"
      >
        <FormCard title="Logo">
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.85}
                            style={[styles.logoWrap, {borderColor: theme.border}]}
                            accessibilityRole="button"
                            accessibilityLabel="Choisir un logo de division"
                            testID="division-logo-action">
            <View style={styles.logoMask}>
              {logoUri ? (
                <Image source={{uri: logoUri}} style={styles.logo} contentFit="contain"/>
              ) : (
                <View style={styles.logoPlaceholder}>
                  <MaterialCommunityIcons name="camera-plus-outline" size={28} color={theme.textInactive}/>
                  <Text style={[styles.logoHint, {color: theme.textInactive}]}>Ajouter un logo</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePickImage}
                            style={[styles.logoBtn, {backgroundColor: theme.backgroundSecondary}]}
                            accessibilityRole="button"
                            accessibilityLabel="Changer le logo">
            <MaterialCommunityIcons name="pencil-outline" size={16} color={theme.text}/>
            <Text style={[styles.logoBtnText, {color: theme.text}]}>Changer le logo</Text>
          </TouchableOpacity>
        </FormCard>

        <FormCard>
          <Field label="Nom" error={formik.errors.name} touched={formik.touched.name}>
            <SheetTextInput
              value={formik.values.name}
              onChangeText={formik.handleChange("name")}
              onBlur={formik.handleBlur("name")}
              placeholder="Nom de la division"
              accessibilityLabel="Nom de la division"
              style={formik.touched.name && formik.errors.name ? {borderColor: theme.error} : undefined}
            />
          </Field>
        </FormCard>

        <FormCard title="Couleur principale">
          <View style={styles.colorRow}>
            <CircleColorPicker value={formik.values.mainColor} onChange={(c) => formik.setFieldValue("mainColor", c)}/>
          </View>
        </FormCard>

        <FormCard title="Dégradé">
          <View style={styles.colorRow}>
            <CircleColorPicker value={formik.values.firstGradientColor}
                               onChange={(c) => formik.setFieldValue("firstGradientColor", c)}/>
            <CircleColorPicker value={formik.values.secondGradientColor}
                               onChange={(c) => formik.setFieldValue("secondGradientColor", c)}/>
            <CircleColorPicker value={formik.values.thirdGradientColor}
                               onChange={(c) => formik.setFieldValue("thirdGradientColor", c)}/>
          </View>
        </FormCard>
      </BottomSheetScrollView>

      <ApiErrorToast message={apiError} onHidden={() => setApiError(null)}/>
    </>
  );
};

export default DivisionForm;

const styles = StyleSheet.create({
  scroll: {gap: 12, padding: 8, paddingBottom: 100},
  logoWrap: {borderWidth: 1.5, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden"},
  logoMask: {
    width: 100,
    aspectRatio: 1,
    borderRadius: 18,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 16
  },
  logo: {width: "100%", height: "100%"},
  logoPlaceholder: {alignItems: "center", gap: 6},
  logoHint: {fontSize: 12, fontWeight: "600"},
  logoBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: CORNERS
  },
  logoBtnText: {fontSize: 12, fontWeight: "700"},
  colorRow: {flexDirection: "row", gap: 16, marginTop: 8, marginLeft: 8},
});
