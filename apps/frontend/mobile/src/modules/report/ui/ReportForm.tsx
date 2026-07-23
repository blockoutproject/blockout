import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import * as Device from "expo-device";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useFormik } from "formik";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Yup from "yup";

import type { Filter } from "@/src/shared/model/Filter";
import type { ImageUpload } from "@/src/shared/model/ImageUpload";
import {
  CreateReportRequest,
  ReportResponse,
  ReportTypeEnum,
} from "@/src/shared/generated/models";
import { useApis } from "@/src/shared/providers/ApiProvider";
import { useSessionState } from "@/src/modules/session/providers/SessionContext";
import {useAppTheme} from "@/src/shared/theme";
import Filters from "@/src/shared/ui/Filters";
import ApiErrorToast from "@/src/shared/ui/feedback/ApiErrorToast";
import {FormField} from "@/src/shared/ui/form/form-field";
import FormCard from "@/src/shared/ui/form/FormCard";
import SheetTextInput from "@/src/shared/ui/form/SheetTextInput";
import { CURRENT_APP_VERSION } from "@/src/modules/app-status/model/appVersion";

export type ReportFormState = {
  loading: boolean;
  canSubmit: boolean;
};

export type ReportContext = {
  screen?: string;
  defaultType?: ReportTypeEnum;
  userId?: string;
};

export type ReportFormProps = {
  context?: ReportContext;
  onSuccess: (created: ReportResponse) => void;
  onRegisterSubmit: (submit: () => void) => void;
  onStateChange?: (state: ReportFormState) => void;
};

type FormValues = {
  type: ReportTypeEnum;
  title: string;
  description: string;
};

const CATEGORY_OPTIONS = [
  { name: "Bug d'affichage", value: ReportTypeEnum.DISPLAY_BUG },
  { name: "Données", value: ReportTypeEnum.DATA_ERROR },
  { name: "Logo", value: ReportTypeEnum.LOGO },
  { name: "Live", value: ReportTypeEnum.LIVE },
  { name: "Autre", value: ReportTypeEnum.OTHER },
] as const;

const ReportForm = ({
  context,
  onSuccess,
  onRegisterSubmit,
  onStateChange,
}: ReportFormProps) => {
  const theme = useAppTheme();
  const { mobile } = useApis();
  const { customUser } = useSessionState();
  const [images, setImages] = useState<ImageUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const initialType = context?.defaultType ?? ReportTypeEnum.DISPLAY_BUG;

  const formik = useFormik<FormValues>({
    initialValues: { type: initialType, title: "", description: "" },
    validationSchema: Yup.object({
      type: Yup.mixed<ReportTypeEnum>().oneOf(Object.values(ReportTypeEnum)).required(),
      title: Yup.string().trim().required("Titre requis 🚨"),
      description: Yup.string()
        .trim()
        .required("Il va nous falloir un peu plus de détails ... 🧐"),
    }),
    validateOnMount: true,
    onSubmit: async (values) => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        setApiError(null);

        const payload: CreateReportRequest = {
          type: values.type,
          title: values.title.trim(),
          description: values.description.trim(),
          appVersion: CURRENT_APP_VERSION ?? undefined,
          userId: context?.userId ?? customUser?.id?.toString() ?? undefined,
          userName: customUser?.pseudo ?? "Guest",
          screen: context?.screen ?? "Unknown",
          deviceModel: Device.modelName ?? undefined,
          os: `${Device.osName ?? "OS"} ${Device.osVersion ?? ""}`.trim(),
        };

        const created = await mobile.reports.createReport(payload, images);
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        onSuccess(created);
      } catch {
        setApiError("Création impossible, réessaie.");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoading(false);
      }
    },
  });

  const filters = useMemo<Filter[]>(
    () =>
      CATEGORY_OPTIONS.map((option) => ({
        name: option.name,
        isActive: option.value === formik.values.type,
      })),
    [formik.values.type],
  );
  const { setFieldValue } = formik;

  const handleFiltersChange = useCallback(
    (updated: Filter[]) => {
      const activeName = updated.find((filter) => filter.isActive)?.name;
      const selected = CATEGORY_OPTIONS.find(
        (option) => option.name === activeName,
      );

      if (selected) void setFieldValue("type", selected.value);
    },
    [setFieldValue],
  );

  const handlePickImage = useCallback(async () => {
    try {
      await Haptics.selectionAsync();
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (pickerResult.canceled) return;

      const asset = pickerResult.assets[0];
      if (!asset?.uri) return;

      const manipulation = ImageManipulator.ImageManipulator.manipulate(
        asset.uri,
      );
      manipulation.resize({ width: 1280 });
      const rendered = await manipulation.renderAsync();
      const saved = await rendered.saveAsync({
        format: ImageManipulator.SaveFormat.JPEG,
        compress: 0.9,
      });

      setImages((current) => [
        ...current,
        {
          uri: saved.uri,
          name: `report-${current.length + 1}.jpg`,
          type: "image/jpeg",
        },
      ]);
    } catch {
      Alert.alert("Erreur", "Impossible de traiter l’image.");
    }
  }, []);

  useEffect(() => {
    onRegisterSubmit(formik.submitForm);
  }, [formik.submitForm, onRegisterSubmit]);

  const canSubmit = useMemo(
    () =>
      formik.isValid &&
      !!formik.values.title.trim() &&
      !!formik.values.description.trim() &&
      !loading,
    [formik.isValid, formik.values.description, formik.values.title, loading],
  );

  useEffect(() => {
    onStateChange?.({ loading, canSubmit });
  }, [canSubmit, loading, onStateChange]);

  return (
    <>
      <BottomSheetScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        testID="report-form"
      >
        <FormCard title="Catégorie">
          <Filters
            filters={filters}
            setFilters={handleFiltersChange}
            singleSelect
            requireSelection
            style={styles.filters}
          />
        </FormCard>

        <FormCard title="Détails">
          <FormField
            label="Titre"
            error={formik.errors.title}
            touched={formik.touched.title}
          >
            <SheetTextInput
              accessibilityLabel="Titre"
              autoCapitalize="sentences"
              enableSuggestions
              value={formik.values.title}
              onChangeText={formik.handleChange("title")}
              onBlur={formik.handleBlur("title")}
              placeholder="Titre"
              style={
                formik.touched.title && formik.errors.title
                  ? { borderColor: theme.error }
                  : undefined
              }
              testID="report-title-input"
            />
          </FormField>

          <FormField
            label="Description"
            error={formik.errors.description}
            touched={formik.touched.description}
          >
            <SheetTextInput
              accessibilityLabel="Description"
              autoCapitalize="sentences"
              enableSuggestions
              multiline
              scrollEnabled
              value={formik.values.description}
              onChangeText={formik.handleChange("description")}
              onBlur={formik.handleBlur("description")}
              placeholder="Décris le problème, les étapes pour le reproduire, le contexte…"
              style={[
                styles.textarea,
                formik.touched.description && formik.errors.description
                  ? { borderColor: theme.error }
                  : undefined,
              ]}
              testID="report-description-input"
            />
          </FormField>
        </FormCard>

        <FormCard title="Captures">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.images}
          >
            {images.map((image) => (
              <View
                key={image.uri}
                style={[styles.thumbnailFrame, { borderColor: theme.border }]}
              >
                <Image
                  accessible={false}
                  source={{ uri: image.uri }}
                  style={styles.thumbnail}
                  contentFit="cover"
                />
              </View>
            ))}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ajouter une capture"
              onPress={handlePickImage}
              style={({ pressed }) => [
                styles.addImageAction,
                {
                  borderColor: theme.border,
                  backgroundColor: theme.backgroundSecondary,
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
              testID="report-add-image-action"
            >
              <MaterialCommunityIcons
                name="image-plus"
                size={20}
                color={theme.textInactive}
              />
              <Text
                style={[styles.addImageLabel, { color: theme.textInactive }]}
              >
                Ajouter
              </Text>
            </Pressable>
          </ScrollView>
        </FormCard>
      </BottomSheetScrollView>

      <ApiErrorToast message={apiError} onHidden={() => setApiError(null)} />
    </>
  );
};

export default ReportForm;

const styles = StyleSheet.create({
  scroll: { gap: 12, padding: 8, paddingBottom: 100 },
  filters: { paddingHorizontal: 0 },
  textarea: { maxHeight: 200, textAlignVertical: "top", minHeight: 180 },
  images: { gap: 10 },
  thumbnailFrame: {
    width: 84,
    height: 84,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1.5,
  },
  thumbnail: { width: "100%", height: "100%" },
  addImageAction: {
    height: 84,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  addImageLabel: { fontSize: 12, fontWeight: "700" },
});
