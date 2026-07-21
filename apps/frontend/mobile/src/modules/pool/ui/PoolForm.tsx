import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useFormik } from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/src/shared/providers/ThemeProvider";
import type {
  PoolInternalResponse,
  PoolResponse,
  UpdatePoolRequest,
} from "@/src/modules/pool/model/Pool";
import { CORNERS } from "@/src/shared/theme/tokens";
import ApiErrorToast from "@/src/shared/ui/feedback/ApiErrorToast";

import FormCard from "@/src/shared/ui/form/FormCard";
import Field from "@/src/shared/ui/form/Field";
import SheetTextInput from "@/src/shared/ui/form/SheetTextInput";
import { useApis } from "@/src/shared/providers/ApiProvider";

export type PoolFormState = {
  loading: boolean;
  canSubmit: boolean;
};

export type PoolFormProps = {
  pool: PoolResponse;
  onSuccess: (updated: PoolInternalResponse) => void;
  onRegisterSubmit: (submit: () => void) => void;
  onStateChange?: (state: PoolFormState) => void;
};

const PoolForm: React.FC<PoolFormProps> = ({
  pool,
  onSuccess,
  onRegisterSubmit,
  onStateChange,
}) => {
  const theme = useAppTheme();
  const { mobile } = useApis();

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const formik = useFormik({
    initialValues: {
      name: pool.name ?? "",
      shortName: pool.shortName ?? "",
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
        const request: UpdatePoolRequest = {
          name: values.name.trim(),
          shortName: values.shortName.trim(),
        };
        const updated = await mobile.pools.updatePool(pool.id, request);
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

  return (
    <View style={styles.form} testID="pool-form">
      <BottomSheetScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <FormCard>
          <Text style={{ color: theme.text, fontWeight: "900" }}>
            {pool.rawName}
          </Text>
        </FormCard>
        <FormCard>
          <Field
            label="Nom"
            error={formik.errors.name}
            touched={formik.touched.name}
          >
            <SheetTextInput
              value={formik.values.name}
              onChangeText={formik.handleChange("name")}
              onBlur={formik.handleBlur("name")}
              placeholder="Nom de la poule"
              accessibilityLabel="Nom de la poule"
              testID="pool-name-input"
              returnKeyType="done"
              style={
                formik.touched.name && formik.errors.name
                  ? { borderColor: theme.error }
                  : undefined
              }
            />
          </Field>
        </FormCard>

        <FormCard>
          <Field
            label="Diminutif"
            error={formik.errors.shortName}
            touched={formik.touched.shortName}
          >
            <SheetTextInput
              value={formik.values.shortName}
              onChangeText={formik.handleChange("shortName")}
              onBlur={formik.handleBlur("shortName")}
              placeholder="Diminutif de la poule"
              accessibilityLabel="Diminutif de la poule"
              testID="pool-short-name-input"
              returnKeyType="done"
              style={
                formik.touched.shortName && formik.errors.shortName
                  ? { borderColor: theme.error }
                  : undefined
              }
            />
          </Field>
        </FormCard>
      </BottomSheetScrollView>

      <ApiErrorToast message={apiError} onHidden={() => setApiError(null)} />
    </View>
  );
};

export default PoolForm;

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
  logoMask: {
    width: 100,
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
    borderRadius: CORNERS,
  },
  logoBtnText: { fontSize: 12, fontWeight: "700" },
});
