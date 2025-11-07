import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Alert, ScrollView, Animated } from "react-native";
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
import { ReportType, type Report, type GitHubIssueResponse } from "@/src/types/Report";
import Filters from "@/src/components/common/Filters";
import type { Filter } from "@/src/types/Filter";
import Field from "@/src/components/common/form/Field";
import { useSession } from "@/src/context/SessionProvider";
import ApiErrorToast from "../common/feedback/ApiErrorToast";
import { useApis } from "@/src/context/ApiProvider";
import { CustomImage } from "@/src/types/Common";

export type ReportFormExternalState = {
    loading: boolean;
    canSubmit: boolean;
};

export type ReportFormProps = {
    context?: {
        screen?: string;
        defaultType?: ReportType;
        userId?: string;
    };
    onSuccess: (created: GitHubIssueResponse) => void;
    onRegisterSubmit: (submit: () => void) => void;
    onStateChange?: (state: ReportFormExternalState) => void;
};

type FormValues = {
    type: ReportType;
    title: string;
    description?: string;
};

const CATEGORY_OPTIONS = [
    { name: "Bug d'affichage", value: ReportType.DISPLAY_BUG },
    { name: "Données", value: ReportType.DATA_ERROR },
    { name: "Autre", value: ReportType.OTHER },
] as const;

const ReportForm: React.FC<ReportFormProps> = ({ context, onSuccess, onRegisterSubmit, onStateChange }) => {
    const theme = useAppTheme();
    const { mobile } = useApis();
    const { customUser } = useSession();

    const [images, setImages] = useState<CustomImage[]>([]);
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
                mediaTypes: ["images"],
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
            setImages((prev) => [...prev, { uri: saved.uri, name: `report-${prev.length + 1}.jpg`, type: "image/jpeg" }]);
        } catch {
            Alert.alert("Erreur", "Impossible de traiter l’image.");
        }
    };

    const initialType = context?.defaultType ?? ReportType.DISPLAY_BUG;

    const formik = useFormik<FormValues>({
        initialValues: { type: initialType, title: "", description: "" },
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
                console.log("zrvzrvzrvzrv", payload)
                const created = await mobile.createReport(payload, images);
                console.log("dddddd")
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSuccess(created);
            } catch (err) {
                console.log(err)
                setApiError("Création impossible, réessaie.");
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
                setLoading(false);
            }
        },
    });

    const [filters, setFilters] = useState<Filter[]>(
        CATEGORY_OPTIONS.map((opt) => ({ name: opt.name, isActive: opt.value === initialType }))
    );

    useEffect(() => {
        const active = filters.find((f) => f.isActive)?.name;
        if (!active) return;
        const found = CATEGORY_OPTIONS.find((c) => c.name === active);
        if (found && found.value !== formik.values.type) {
            formik.setFieldValue("type", found.value);
        }
    }, [filters, formik]);

    useEffect(() => {
        onRegisterSubmit(formik.submitForm);
    }, [formik.submitForm, onRegisterSubmit]);

    const canSubmit = useMemo(() => formik.isValid && !loading, [formik.isValid, loading]);

    useEffect(() => {
        onStateChange?.({ loading, canSubmit });
    }, [loading, canSubmit, onStateChange]);

    return (
        <>
            <BottomSheetScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Catégorie</Text>
                    <Filters
                        filters={filters}
                        setFilters={setFilters}
                        singleSelect
                        requireSelection
                        style={{ paddingHorizontal: 0 }}
                    />
                </View>

                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Détails</Text>

                    <Field label="Titre" error={formik.errors.title as string} touched={formik.touched.title}>
                        <BottomSheetTextInput
                            style={[
                                styles.input,
                                { borderColor: theme.border, color: theme.text },
                                formik.touched.title && formik.errors.title ? { borderColor: theme.error } : null,
                            ]}
                            value={formik.values.title}
                            onChangeText={formik.handleChange("title")}
                            onBlur={formik.handleBlur("title")}
                            placeholder="Titre"
                            placeholderTextColor={theme.textInactive}
                            testID="report-title-input"
                        />
                    </Field>

                    <Field label="Description" error={formik.errors.description as string} touched={formik.touched.description}>
                        <BottomSheetTextInput
                            multiline
                            scrollEnabled
                            style={[
                                styles.input,
                                styles.textarea,
                                { borderColor: theme.border, color: theme.text },
                                formik.touched.description && formik.errors.description ? { borderColor: theme.error } : null,
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

                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Captures</Text>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                        {images.map((img, i) => (
                            <View key={i} style={[styles.thumbWrap, { borderColor: theme.border }]}>
                                <Image source={{ uri: img.uri }} style={styles.thumb} contentFit="cover" />
                            </View>
                        ))}

                        <TouchableOpacity
                            onPress={handlePickImage}
                            activeOpacity={0.85}
                            style={[styles.addBtn, { borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
                            testID="add-image-btn"
                        >
                            <MaterialCommunityIcons name="image-plus" size={20} color={theme.textInactive} />
                            <Text style={[styles.addBtnText, { color: theme.textInactive }]}>Ajouter</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </BottomSheetScrollView>

            <ApiErrorToast
                message={apiError}
                onHidden={() => setApiError(null)}
            />
        </>
    );
};

export default ReportForm;

const styles = StyleSheet.create({
    scroll: { gap: 12, padding: 8 },
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
    sectionTitle: { fontSize: 13, fontWeight: "800", textTransform: "uppercase", opacity: 0.85 },
    input: { borderWidth: 1.5, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, fontSize: 14 },
    textarea: { maxHeight: 200, textAlignVertical: "top", minHeight: 180 },
    thumbWrap: { width: 84, height: 84, borderRadius: 14, overflow: "hidden", borderWidth: 1.5 },
    thumb: { width: "100%", height: "100%" },
    addBtn: { height: 84, paddingHorizontal: 14, borderWidth: 1.5, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 },
    addBtnText: { fontSize: 12, fontWeight: "700" },
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
    apiErrorText: { flex: 1, fontSize: 14, fontWeight: "600" },
});