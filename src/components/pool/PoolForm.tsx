import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useFormik } from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";

import { useAppTheme } from "@/src/context/ThemeProvider";
import type { EnrichedPoolDTO, Pool } from "@/src/types/Pool";
import { CORNERS } from "@/src/theme/globals";
import ApiErrorToast from "@/src/components/common/feedback/ApiErrorToast";

import FormCard from "@/src/components/common/form/FormCard";
import Field from "@/src/components/common/form/Field";
import SheetTextInput from "@/src/components/common/form/SheetTextInput";
import { useApis } from "@/src/context/ApiProvider";

export type PoolFormExternalState = {
    loading: boolean;
    canSubmit: boolean;
};

export type PoolFormProps = {
    pool: EnrichedPoolDTO;
    onSuccess: (updated?: Pool) => void;
    onRegisterSubmit: (submit: () => void) => void;
    onStateChange?: (state: PoolFormExternalState) => void;
};

const PoolForm: React.FC<PoolFormProps> = ({ pool, onSuccess, onRegisterSubmit, onStateChange }) => {
    const theme = useAppTheme();
    const { mobile } = useApis();

    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const formik = useFormik({
        initialValues: { 
            name: pool.name ?? "",
            shortName: pool.shortName ?? ""
        },
        validationSchema: Yup.object({ 
            name: Yup.string().trim().required("Nom requis"),
            shortName: Yup.string().trim().required("Diminutif requis")
        }),
        onSubmit: async (values) => {
            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setLoading(true);
                setApiError(null);
                const dto = { 
                    name: values.name.trim(),
                    shortName: values.shortName.trim()
                };
                const updated = await mobile.pools.updatePool(pool.id, dto);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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

    const canSubmit = useMemo(() => formik.isValid && !loading, [formik.isValid, loading]);

    useEffect(() => {
        onStateChange?.({ loading, canSubmit });
    }, [loading, canSubmit, onStateChange]);

    return (
        <>
            <BottomSheetScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <FormCard>
                    <Text style={{ color: theme.text, fontWeight: "900" }}>{pool.name}</Text>
                </FormCard>
                <FormCard>
                    <Field label="Nom" error={formik.errors.name} touched={formik.touched.name}>
                        <SheetTextInput
                            value={formik.values.name}
                            onChangeText={formik.handleChange("name")}
                            onBlur={formik.handleBlur("name")}
                            placeholder="Nom de l'équipe"
                            returnKeyType="done"
                            style={formik.touched.name && formik.errors.name ? { borderColor: theme.error } : undefined}
                        />
                    </Field>
                </FormCard>

                <FormCard>
                    <Field label="Diminutif" error={formik.errors.shortName} touched={formik.touched.shortName}>
                        <SheetTextInput
                            value={formik.values.shortName}
                            onChangeText={formik.handleChange("shortName")}
                            onBlur={formik.handleBlur("shortName")}
                            placeholder="Diminutif de l'équipe"
                            returnKeyType="done"
                            style={formik.touched.shortName && formik.errors.shortName ? { borderColor: theme.error } : undefined}
                        />
                    </Field>
                </FormCard>
            </BottomSheetScrollView>

            <ApiErrorToast message={apiError} onHidden={() => setApiError(null)} />
        </>
    );
};

export default PoolForm;

const styles = StyleSheet.create({
    scroll: { gap: 12, padding: 8 },
    logoWrap: { borderWidth: 1.5, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    logoMask: { width: 100, aspectRatio: 1, borderRadius: 18, overflow: "hidden", alignItems: "center", justifyContent: "center", marginVertical: 16 },
    logo: { width: "100%", height: "100%" },
    logoPlaceholder: { alignItems: "center", gap: 6 },
    logoHint: { fontSize: 12, fontWeight: "600" },
    logoBtn: { alignSelf: "flex-start", flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: CORNERS },
    logoBtnText: { fontSize: 12, fontWeight: "700" },
});