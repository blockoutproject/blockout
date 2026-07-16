import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import {
    BottomSheetScrollView,
    BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { useFormik } from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useApis } from "@/src/context/ApiProvider";
import FormCard from "@/src/components/common/form/FormCard";
import ApiErrorToast from "@/src/components/common/feedback/ApiErrorToast";
import { ApiError } from "@/src/api/core/ApiError";
import { MatchLiveLinkReportRequestDTO } from "@/src/types/Match";
import Field from "../../common/form/Field";

export type MatchLiveLinkReportFormExternalState = {
    loading: boolean;
    canSubmit: boolean;
};

export type MatchLiveLinkReportFormProps = {
    matchId: number;
    onSuccess: () => void;
    onRegisterSubmit: (submit: () => void) => void;
    onStateChange?: (state: MatchLiveLinkReportFormExternalState) => void;
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
    onRegisterSubmit,
    onStateChange,
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
                await Haptics.impactAsync(
                    Haptics.ImpactFeedbackStyle.Medium,
                );

                const payload: MatchLiveLinkReportRequestDTO = {
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
                await Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Error,
                );
            } finally {
                setLoading(false);
            }
        },
    });

    const canSubmit = useMemo(
        () =>
            formik.isValid &&
            !!formik.values.reason.trim() &&
            !loading,
        [formik.isValid, formik.values.reason, loading],
    );

    useEffect(() => {
        onRegisterSubmit(formik.submitForm);
    }, [formik.submitForm, onRegisterSubmit]);

    useEffect(() => {
        onStateChange?.({ loading, canSubmit });
    }, [loading, canSubmit, onStateChange]);

    const showFieldError = formik.touched.reason && !!formik.errors.reason;

    return (
        <>
            <BottomSheetScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                <FormCard title="Signaler un lien">
                    <Field
                        error={formik.errors.reason as string}
                        touched={formik.touched.reason}
                    >
                        <BottomSheetTextInput
                            style={[
                                styles.input,
                                {
                                    borderColor: showFieldError
                                        ? theme.error
                                        : theme.border,
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
                    </Field>
                </FormCard>
            </BottomSheetScrollView>

            <ApiErrorToast
                message={apiError}
                onHidden={() => setApiError(null)}
            />
        </>
    );
};

export default MatchLiveLinkReportForm;

const styles = StyleSheet.create({
    scroll: {
        gap: 12,
        padding: 8,
        paddingBottom: 100
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