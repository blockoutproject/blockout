// FILE: src/components/match/form/MatchLiveLinkForm.tsx

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import {
    BottomSheetScrollView,
    BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFormik } from "formik";
import * as Yup from "yup";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useApis } from "@/src/context/ApiProvider";
import FormCard from "@/src/components/common/form/FormCard";
import ApiErrorToast from "@/src/components/common/feedback/ApiErrorToast";
import { ApiError } from "@/src/api/core/ApiError";
import Field from "../../common/form/Field";
import { withAlpha } from "@/src/utils/utils";
import useHasScopes from "@/src/hooks/user/useHasScopes";

export type MatchLiveLinkFormExternalState = {
    loading: boolean;
    canSubmit: boolean;
};

export type MatchLiveLinkFormProps = {
    matchId: number;
    isMatchFinished: boolean;
    initialUrl?: string | null;
    onSuccess: () => void;
    onRegisterSubmit: (submit: () => void) => void;
    onStateChange?: (state: MatchLiveLinkFormExternalState) => void;
    isBeforeLiveWindow?: boolean;
};

export const getLiveLinkErrorMessage = (err: unknown): string => {
    if (err instanceof ApiError) {
        if (err.status === 0 || err.status >= 500) {
            return "Le serveur rencontre un problème, réessaie dans quelques instants.";
        }
        if (err.message && err.message.trim().length > 0) {
            return err.message;
        }
        return "Lien invalide ou non accepté.";
    }
    return "Action impossible, réessaie.";
};

type FormValues = {
    url: string;
};

const validationSchema = Yup.object({
    url: Yup.string().trim().required("Lien requis"),
});

const MatchLiveLinkForm: React.FC<MatchLiveLinkFormProps> = ({
    matchId,
    isMatchFinished,
    initialUrl,
    onSuccess,
    onRegisterSubmit,
    onStateChange,
    isBeforeLiveWindow = false,
}) => {
    const theme = useAppTheme();
    const { mobile } = useApis();

    const { allowed: isModerator } = useHasScopes([
        "moderate:match_live_link",
    ]);

    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const hasExisting = useMemo(() => !!initialUrl, [initialUrl]);

    const formik = useFormik<FormValues>({
        initialValues: { url: initialUrl ?? "" },
        validationSchema,
        validateOnMount: true,
        onSubmit: async (values) => {
            if (isBeforeLiveWindow && !isModerator) return;
            const trimmed = values.url.trim();
            if (!trimmed) return;

            try {
                setLoading(true);
                setApiError(null);
                await Haptics.impactAsync(
                    Haptics.ImpactFeedbackStyle.Medium,
                );

                await mobile.matches.upsertMatchLiveLink(matchId, {
                    url: trimmed,
                });
                await Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success,
                );
                onSuccess();
            } catch (err) {
                console.log(err);
                const msg = getLiveLinkErrorMessage(err);
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
            !!formik.values.url.trim() &&
            !loading &&
            (!isBeforeLiveWindow || isModerator),
        [formik.isValid, formik.values.url, loading, isBeforeLiveWindow],
    );

    useEffect(() => {
        onRegisterSubmit(formik.submitForm);
    }, [formik.submitForm, onRegisterSubmit]);

    useEffect(() => {
        onStateChange?.({ loading, canSubmit });
    }, [loading, canSubmit, onStateChange]);

    const title = useMemo(() => {
        if (hasExisting && isMatchFinished) return "Mettre à jour la rediffusion";
        if (!hasExisting && isMatchFinished) return "Ajouter une rediffusion";
        if (hasExisting && !isMatchFinished)
            return "Mettre à jour le lien du live";
        return "Ajouter un lien de live";
    }, [hasExisting, isMatchFinished]);

    const subtitle = useMemo(() => {
        if (isMatchFinished) {
            return "Colle ici un lien YouTube, Twitch ou Facebook vers la rediffusion. Il sera vérifié avant d’être visible sur la fiche du match.";
        }
        return "Colle ici un lien YouTube, Twitch ou Facebook pour partager ce match en direct.";
    }, [isMatchFinished]);

    const placeholder = "https://youtube.com/…";

    const showFieldError = formik.touched.url && !!formik.errors.url;
    const wrapperBorderColor = showFieldError ? theme.error : theme.border;

    return (
        <>
            <BottomSheetScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                <FormCard title={title}>
                    <Text
                        style={[
                            styles.subtitle,
                            { color: theme.textInactive },
                        ]}
                    >
                        {subtitle}
                    </Text>

                    <View style={styles.platformRow}>
                        <View
                            style={[
                                styles.platformIcon,
                                {
                                    backgroundColor: theme.surface,
                                    borderColor: theme.border,
                                },
                            ]}
                        >
                            <MaterialCommunityIcons
                                name="youtube"
                                size={18}
                                color={theme.textInactive}
                            />
                        </View>
                        <View
                            style={[
                                styles.platformIcon,
                                {
                                    backgroundColor: theme.surface,
                                    borderColor: theme.border,
                                },
                            ]}
                        >
                            <MaterialCommunityIcons
                                name="twitch"
                                size={18}
                                color={theme.textInactive}
                            />
                        </View>
                        <View
                            style={[
                                styles.platformIcon,
                                {
                                    backgroundColor: theme.surface,
                                    borderColor: theme.border,
                                },
                            ]}
                        >
                            <MaterialCommunityIcons
                                name="facebook"
                                size={18}
                                color={theme.textInactive}
                            />
                        </View>

                        <Text
                            style={[
                                styles.platformHint,
                                { color: theme.textInactive },
                            ]}
                        >
                            Plateformes supportées
                        </Text>
                    </View>

                    {isMatchFinished && (
                        <View
                            style={[
                                styles.warningBox,
                                {
                                    backgroundColor: withAlpha(
                                        theme.warning,
                                        0.12,
                                    ),
                                    borderColor: theme.warning,
                                },
                            ]}
                        >
                            <MaterialCommunityIcons
                                name="shield-check-outline"
                                size={18}
                                color={theme.warning}
                            />
                            <Text
                                style={[
                                    styles.warningText,
                                    { color: theme.warning },
                                ]}
                            >
                                Les rediffusions sont soumises à validation.
                                Ton lien sera affiché une fois approuvé par la
                                modération.
                            </Text>
                        </View>
                    )}

                    <View style={styles.fieldBlock}>
                        <Text
                            style={[styles.label, { color: theme.text }]}
                        >
                            Lien du live
                        </Text>

                        {isBeforeLiveWindow && !isModerator ? (
                            <View style={styles.lockBanner}>
                                <MaterialCommunityIcons
                                    name="clock-outline"
                                    size={16}
                                    color={theme.warning}
                                />
                                <Text
                                    style={[
                                        styles.lockHint,
                                        { color: theme.warning },
                                    ]}
                                >
                                    Tu pourras ajouter ou modifier le lien à
                                    partir d’une heure avant le début du match.
                                </Text>
                            </View>
                        ) : (
                            <Field
                                error={formik.errors.url as string}
                                touched={formik.touched.url}
                            >
                                <View
                                    style={[
                                        styles.inputWrapper,
                                        {
                                            borderColor: wrapperBorderColor,
                                            backgroundColor: theme.surface,
                                        },
                                    ]}
                                >
                                    <BottomSheetTextInput
                                        value={formik.values.url}
                                        onChangeText={formik.handleChange(
                                            "url",
                                        )}
                                        onBlur={formik.handleBlur("url")}
                                        placeholder={placeholder}
                                        placeholderTextColor={theme.textInactive}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        keyboardType="url"
                                        editable={!loading}
                                        style={[
                                            styles.input,
                                            { color: theme.text },
                                        ]}
                                    />
                                </View>
                            </Field>
                        )}
                    </View>
                </FormCard>
            </BottomSheetScrollView>

            <ApiErrorToast
                message={apiError}
                onHidden={() => setApiError(null)}
            />
        </>
    );
};

export default MatchLiveLinkForm;

const styles = StyleSheet.create({
    scroll: {
        gap: 12,
        padding: 8,
        paddingBottom: 100
    },
    subtitle: {
        fontSize: 13,
        fontWeight: "500",
    },
    platformRow: {
        flexDirection: "row",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 8,
    },
    platformIcon: {
        width: 28,
        height: 28,
        borderRadius: 999,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
    },
    platformHint: {
        fontSize: 11,
        fontWeight: "600",
    },
    warningBox: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderWidth: 1,
        marginTop: 10,
    },
    warningText: {
        fontSize: 12,
        fontWeight: "700",
        flex: 1,
    },
    fieldBlock: {
        gap: 8,
        marginTop: 12,
    },
    label: {
        fontSize: 13,
        fontWeight: "700",
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1.5,
        borderRadius: 16,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    input: {
        flex: 1,
        fontSize: 14,
        paddingVertical: 2,
    },
    lockBanner: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 2,
    },
    lockHint: {
        fontSize: 12,
        fontWeight: "700",
        flex: 1,
    },
});