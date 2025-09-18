import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useFormik } from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Device from "expo-device";
import * as Application from "expo-application";

import { useAppTheme } from "@/src/context/ThemeProvider";
import ReportsApi from "@/src/api/ReportsApi";
import { CORNERS } from "@/src/theme/globals";
import { ReportType, type Report, type GitHubIssueResponse } from "@/src/types/Report";
import Filters from "@/src/components/common/Filters";
import type { Filter } from "@/src/types/Filter";
import Field from "@/src/components/common/form/Field";
import useKeyboardVisible from "@/src/hooks/utils/useKeyboardVisible";
import { useSession } from "@/src/context/SessionProvider";

/** Lightweight context to prefill the form. */
export type ReportFormProps = {
    /** Optional context to enrich the report. */
    context?: {
        /** Screen where the report is created. */
        screen?: string;
        /** Default category. */
        defaultType?: ReportType;
        /** Explicit user id if different from session. */
        userId?: string;
    };
    /** Callback when the report has been created. */
    onSuccess: (created: GitHubIssueResponse) => void;
};

type FormValues = {
    /** Report category. */
    type: ReportType;
    /** Short title. */
    title: string;
    /** Detailed description. */
    description?: string;
};

const FOOTER_HEIGHT = 60;

const CATEGORY_OPTIONS = [
    { name: "Bug d'affichage", value: ReportType.DISPLAY_BUG },
    { name: "Données", value: ReportType.DATA_ERROR },
    { name: "Autre", value: ReportType.OTHER },
] as const;

const ReportForm: React.FC<ReportFormProps> = ({ context, onSuccess }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const api = ReportsApi.getInstance();
    const { customUser } = useSession();
    const isKeyboardVisible = useKeyboardVisible();

    const [images, setImages] = useState<{ uri: string; name: string; type: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const errorOpacity = useRef(new Animated.Value(0)).current;
    const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (apiError) {
            if (errorTimerRef.current) {
                clearTimeout(errorTimerRef.current);
                errorTimerRef.current = null;
            }
            errorOpacity.setValue(0);
            Animated.timing(errorOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
            errorTimerRef.current = setTimeout(() => {
                Animated.timing(errorOpacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
                    if (finished) setApiError(null);
                });
            }, 5000);
        }
        return () => {
            if (errorTimerRef.current) {
                clearTimeout(errorTimerRef.current);
                errorTimerRef.current = null;
            }
        };
    }, [apiError, errorOpacity]);

    const handlePickImage = async () => {
        try {
            await Haptics.selectionAsync();
            const pickerResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 1,
            });
            if (pickerResult.canceled) return;

            const asset = pickerResult.assets[0];
            if (!asset?.uri) return;

            const manip = ImageManipulator.ImageManipulator.manipulate(asset.uri);
            manip.resize({ width: 1280 });
            const rendered = await manip.renderAsync();
            const saved = await rendered.saveAsync({
                format: ImageManipulator.SaveFormat.JPEG,
                compress: 0.9,
            });

            setImages((prev) => [
                ...prev,
                {
                    uri: saved.uri,
                    name: `report-${prev.length + 1}.jpg`,
                    type: "image/jpeg",
                },
            ]);
        } catch {
            Alert.alert("Erreur", "Impossible de traiter l’image.");
        }
    };

    const initialType = context?.defaultType ?? ReportType.DISPLAY_BUG;

    const formik = useFormik<FormValues>({
        initialValues: {
            type: initialType,
            title: "",
            description: "",
        },
        validationSchema: Yup.object({
            type: Yup.mixed<ReportType>().oneOf(Object.values(ReportType)).required(),
            title: Yup.string().trim().required("Titre requis 🚨"),
            description: Yup.string().trim().required("Il va nous falloir un peu plus de détails ... 🧐"),
        }),
        onSubmit: async (values) => {
            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setLoading(true);
                setApiError(null);

                const payload: Partial<Report> = {
                    type: values.type,
                    title: values.title.trim(),
                    description: values.description?.trim() || undefined,
                    appVersion: Application.nativeApplicationVersion ?? undefined,
                    userId: context?.userId ?? customUser?.id?.toString() ?? undefined,
                    userName: customUser?.pseudo ?? undefined,
                    screen: context?.screen ?? "Unknown",
                    deviceModel: Device.modelName ?? undefined,
                    os: `${Device.osName ?? "OS"} ${Device.osVersion ?? ""}`.trim(),
                };

                const created = await api.createReport(payload, images);
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSuccess(created);
            } catch {
                setApiError("Création impossible, réessaie.");
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
                setLoading(false);
            }
        },
    });

    const [filters, setFilters] = useState<Filter[]>(
        CATEGORY_OPTIONS.map((opt) => ({
            name: opt.name,
            isActive: opt.value === initialType,
        }))
    );

    useEffect(() => {
        const active = filters.find((f) => f.isActive)?.name;
        if (!active) return;
        const found = CATEGORY_OPTIONS.find((c) => c.name === active);
        if (found && found.value !== formik.values.type) {
            formik.setFieldValue("type", found.value);
        }
    }, [filters, formik]);

    const outerPaddingBottom = isKeyboardVisible ? 8 : insets.bottom + 8;
    const errorBottomOffset = FOOTER_HEIGHT + outerPaddingBottom;

    return (
        <View
            style={{
                flex: 1,
                paddingBottom: outerPaddingBottom,
            }}
            testID="report-form"
        >
            <BottomSheetScrollView
                contentContainerStyle={[
                    styles.scroll,
                    {
                        paddingBottom: FOOTER_HEIGHT + outerPaddingBottom,
                    },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.surface,
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.sectionTitle,
                            {
                                color: theme.text,
                            },
                        ]}
                    >
                        Catégorie
                    </Text>

                    <Filters
                        filters={filters}
                        setFilters={setFilters}
                        singleSelect
                        requireSelection
                        containerStyle={{
                            paddingHorizontal: 0,
                        }}
                    />
                </View>

                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.surface,
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.sectionTitle,
                            {
                                color: theme.text,
                            },
                        ]}
                    >
                        Détails
                    </Text>

                    <Field
                        label="Titre"
                        error={formik.errors.title as string}
                        touched={formik.touched.title}
                    >
                        <BottomSheetTextInput
                            style={[
                                styles.input,
                                {
                                    borderColor: theme.border,
                                    color: theme.text,
                                },
                                formik.touched.title && formik.errors.title
                                    ? {
                                        borderColor: theme.error,
                                    }
                                    : null,
                            ]}
                            value={formik.values.title}
                            onChangeText={formik.handleChange("title")}
                            onBlur={formik.handleBlur("title")}
                            placeholder="Titre"
                            placeholderTextColor={theme.textInactive}
                            testID="report-title-input"
                        />
                    </Field>

                    <Field
                        label="Description"
                        error={formik.errors.description as string}
                        touched={formik.touched.description}
                    >
                        <BottomSheetTextInput
                            multiline
                            scrollEnabled
                            style={[
                                styles.input,
                                styles.textarea,
                                {
                                    borderColor: theme.border,
                                    color: theme.text,
                                },
                                formik.touched.description && formik.errors.description
                                    ? {
                                        borderColor: theme.error,
                                    }
                                    : null,
                            ]}
                            value={formik.values.description}
                            onChangeText={formik.handleChange("description")}
                            onBlur={formik.handleBlur("description")}
                            placeholder="Décris le problème, les étapes pour le reproduire, le contexte…"
                            placeholderTextColor={theme.textInactive}
                            testID="report-description-input"
                        />
                    </Field>
                </View>

                <View
                    style={[
                        styles.card,
                        {
                            backgroundColor: theme.surface,
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.sectionTitle,
                            {
                                color: theme.text,
                            },
                        ]}
                    >
                        Captures
                    </Text>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{
                            gap: 10,
                        }}
                    >
                        {images.map((img, i) => (
                            <View
                                key={i}
                                style={[
                                    styles.thumbWrap,
                                    {
                                        borderColor: theme.border,
                                    },
                                ]}
                            >
                                <Image
                                    source={{
                                        uri: img.uri,
                                    }}
                                    style={styles.thumb}
                                    contentFit="cover"
                                />
                            </View>
                        ))}

                        <TouchableOpacity
                            onPress={handlePickImage}
                            activeOpacity={0.85}
                            style={[
                                styles.addBtn,
                                {
                                    borderColor: theme.border,
                                    backgroundColor: theme.backgroundSecondary,
                                },
                            ]}
                            testID="add-image-btn"
                        >
                            <MaterialCommunityIcons
                                name="image-plus"
                                size={20}
                                color={theme.textInactive}
                            />
                            <Text
                                style={[
                                    styles.addBtnText,
                                    {
                                        color: theme.textInactive,
                                    },
                                ]}
                            >
                                Ajouter
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </BottomSheetScrollView>

            {apiError ? (
                <Animated.View
                    style={[
                        styles.apiErrorContainer,
                        {
                            backgroundColor: `${theme.error}22`,
                            borderColor: theme.error,
                            bottom: errorBottomOffset,
                            opacity: errorOpacity,
                            transform: [
                                {
                                    translateY: errorOpacity.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [8, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                    pointerEvents="box-none"
                    testID="report-error-toast"
                >
                    <MaterialCommunityIcons
                        name="alert-circle-outline"
                        size={18}
                        color={theme.error}
                    />
                    <Text
                        style={[
                            styles.apiErrorText,
                            {
                                color: theme.error,
                            },
                        ]}
                    >
                        {apiError}
                    </Text>
                </Animated.View>
            ) : null}

            <View>
                <View
                    style={[
                        styles.footer,
                        {
                            backgroundColor: theme.backgroundSecondary,
                            borderTopColor: theme.border,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={[
                            styles.submitBtn,
                            {
                                backgroundColor: theme.primary,
                                opacity: loading ? 0.7 : 1,
                            },
                        ]}
                        disabled={loading}
                        onPress={() => formik.handleSubmit()}
                        testID="submit-report-btn"
                    >
                        {loading ? (
                            <ActivityIndicator
                                color={theme.text}
                            />
                        ) : (
                            <>
                                <MaterialCommunityIcons
                                    name="send"
                                    size={18}
                                    color={theme.text}
                                />
                                <Text
                                    style={[
                                        styles.submitText,
                                        {
                                            color: theme.text,
                                        },
                                    ]}
                                >
                                    Envoyer
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export default ReportForm;

const styles = StyleSheet.create({
    scroll: {
        gap: 12,
        paddingHorizontal: 8,
    },
    card: {
        borderRadius: 18,
        padding: 14,
        gap: 12,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: "800",
        textTransform: "uppercase",
        opacity: 0.85,
    },
    input: {
        borderWidth: 1.5,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 14,
        fontSize: 14,
    },
    textarea: {
        maxHeight: 200,
        textAlignVertical: "top",
        minHeight: 180,
    },
    thumbWrap: {
        width: 84,
        height: 84,
        borderRadius: 14,
        overflow: "hidden",
        borderWidth: 1.5,
    },
    thumb: {
        width: "100%",
        height: "100%",
    },
    addBtn: {
        height: 84,
        paddingHorizontal: 14,
        borderWidth: 1.5,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 6,
    },
    addBtnText: {
        fontSize: 12,
        fontWeight: "700",
    },
    apiErrorContainer: {
        position: "absolute",
        left: 12,
        right: 12,
        borderRadius: 12,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 8,
        gap: 8,
        zIndex: 20,
    },
    apiErrorText: {
        flex: 1,
        fontSize: 14,
        fontWeight: "600",
    },
    footer: {
        height: FOOTER_HEIGHT,
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        justifyContent: "center",
    },
    submitBtn: {
        borderRadius: CORNERS,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    submitText: {
        fontWeight: "800",
        fontSize: 16,
    },
});