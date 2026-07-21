import React, {useEffect, useMemo, useState} from "react";
import {StyleSheet} from "react-native";
import {BottomSheetScrollView} from "@gorhom/bottom-sheet";
import {useFormik} from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";

import {useAppTheme} from "@/src/context/ThemeProvider";
import type {LegalDocument} from "@/src/types/LegalDocument";
import ApiErrorToast from "@/src/components/common/feedback/ApiErrorToast";

import FormCard from "@/src/components/common/form/FormCard";
import Field from "@/src/components/common/form/Field";
import SheetTextInput from "@/src/components/common/form/SheetTextInput";
import {useApis} from "@/src/context/ApiProvider";

export type LegalDocumentFormExternalState = {
  loading: boolean;
  canSubmit: boolean;
};

export type LegalDocumentFormProps = {
  document: LegalDocument;
  onSuccess: () => void;
  onRegisterSubmit: (submit: () => void) => void;
  onStateChange?: (state: LegalDocumentFormExternalState) => void;
};

const LegalDocumentForm: React.FC<LegalDocumentFormProps> = ({
                                                               document,
                                                               onSuccess,
                                                               onRegisterSubmit,
                                                               onStateChange,
                                                             }) => {
  const theme = useAppTheme();
  const {mobile} = useApis();

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      title: document.title,
      version: document.version,
      content: document.content,
    },
    validationSchema: Yup.object({
      title: Yup.string().required("Titre requis"),
      version: Yup.string().required("Version requise"),
      content: Yup.string().required("Contenu requis"),
    }),
    onSubmit: async (values) => {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setLoading(true);
        setApiError(null);
        await mobile.config.updateLegalDocument(document.type, values);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onSuccess();
      } catch {
        setApiError("Erreur lors de la sauvegarde.");
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
    onStateChange?.({loading, canSubmit});
  }, [loading, canSubmit, onStateChange]);

  return (
    <>
      <BottomSheetScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <FormCard>
          <Field label="Titre" error={formik.errors.title} touched={formik.touched.title}>
            <SheetTextInput
              value={formik.values.title}
              onChangeText={formik.handleChange("title")}
              onBlur={formik.handleBlur("title")}
              placeholder="Titre"
              style={formik.touched.title && formik.errors.title ? {borderColor: theme.error} : undefined}
            />
          </Field>
        </FormCard>

        <FormCard>
          <Field label="Version" error={formik.errors.version} touched={formik.touched.version}>
            <SheetTextInput
              value={formik.values.version}
              onChangeText={formik.handleChange("version")}
              onBlur={formik.handleBlur("version")}
              placeholder="2025-08-08"
              style={formik.touched.version && formik.errors.version ? {borderColor: theme.error} : undefined}
            />
          </Field>
        </FormCard>

        <FormCard>
          <Field label="Contenu (Markdown)" error={formik.errors.content} touched={formik.touched.content}>
            <SheetTextInput
              multiline
              scrollEnabled
              value={formik.values.content}
              onChangeText={formik.handleChange("content")}
              onBlur={formik.handleBlur("content")}
              placeholder="Contenu du document légal..."
              style={[
                {maxHeight: 300, textAlignVertical: "top", minHeight: 180},
                formik.touched.content && formik.errors.content ? {borderColor: theme.error} : undefined,
              ]}
            />
          </Field>
        </FormCard>
      </BottomSheetScrollView>

      <ApiErrorToast message={apiError} onHidden={() => setApiError(null)}/>
    </>
  );
};

export default LegalDocumentForm;

const styles = StyleSheet.create({
  content: {padding: 8, paddingBottom: 100, gap: 12},
});
