import React, { useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useFormik } from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/src/shared/theme";
import { useApis } from "@/src/shared/providers/api-provider";
import FormCard from "@/src/shared/ui/form/form-card";
import ApiErrorToast from "@/src/shared/ui/feedback/api-error-toast";
import { ApiError } from "@/src/shared/api/api-error";
import { ReportMatchLiveLinkRequest } from "@/src/shared/generated/models";
import { FormField } from "@/src/shared/ui/form/form-field";
import { useFormSheetBinding } from "@/src/shared/ui/form/form-sheet";

export type MatchLiveLinkReportFormProps = {
  matchId: number;
  onSuccess: () => void;
};

const getReportErrorMessage = (err: unknown): string => {
  if (err instanceof ApiError) {
    if (err.status === 0 || err.status >= 500) {
      return "Le serveur rencontre un problème, réessaie dans quelques instants.";
    }

    if (err.message && err.message.trim().length > 0) {
      return err.message;
    }

    return "Impossible de signaler ce lien.";
  }

  return "Action impossible, réessaie.";
};

type FormValues = {
  reason: string;
};

const validationSchema = Yup.object({
  reason: Yup.string()
    .trim()
    .min(10, "Il va falloir m'en dire un peu plus 😉")
    .max(500, "Merci de faire plus court, 500 caractères suffisent.")
    .required("Il va falloir m'en dire un peu plus 😉"),
});

const MatchLiveLinkReportForm: React.FC<MatchLiveLinkReportFormProps> = ({
  matchId,
  onSuccess,
}) => {
  const theme = useAppTheme();
  const { mobile } = useApis();

  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const formik = useFormik<FormValues>({
    initialValues: { reason: "" },
    validationSchema,
    validateOnMount: true,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        setApiError(null);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const payload: ReportMatchLiveLinkRequest = {
          reason: values.reason.trim(),
        };

        await mobile.matches.reportMatchLiveLink(matchId, payload);
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
        onSuccess();
      } catch (err) {
        const msg = getReportErrorMessage(err);
        setApiError(msg);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setLoading(false);
      }
    },
  });

  const canSubmit = useMemo(
    () => formik.isValid && !!formik.values.reason.trim() && !loading,
    [formik.isValid, formik.values.reason, loading],
  );

  useFormSheetBinding({
    submit: formik.submitForm,
    loading,
    canSubmit,
  });

  const showFieldError = formik.touched.reason && !!formik.errors.reason;

  return (
    <>
      <BottomSheetScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <FormCard title="Signaler un lien">
          <FormField
            error={formik.errors.reason as string}
            touched={formik.touched.reason}
          >
            <BottomSheetTextInput
              style={[
                styles.input,
                {
                  borderColor: showFieldError ? theme.error : theme.border,
                  color: theme.text,
                  backgroundColor: theme.surface,
                },
              ]}
              placeholder="Explique pourquoi ce lien est incorrect, inapproprié ou ne correspond pas à ce match…"
              placeholderTextColor={theme.textInactive}
              value={formik.values.reason}
              onChangeText={formik.handleChange("reason")}
              onBlur={formik.handleBlur("reason")}
              multiline
            />
          </FormField>
        </FormCard>
      </BottomSheetScrollView>

      <ApiErrorToast message={apiError} onHidden={() => setApiError(null)} />
    </>
  );
};

export default MatchLiveLinkReportForm;

const styles = StyleSheet.create({
  scroll: {
    gap: 12,
    padding: 8,
    paddingBottom: 100,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 140,
    textAlignVertical: "top",
  },
});
