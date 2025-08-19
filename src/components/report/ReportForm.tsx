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
import { useUserContext } from "@/src/context/UserProvider";

type ReportFormProps = {
    context?: {
        screen?: string;
        defaultType?: ReportType;
        userId?: string;
    };
    onSuccess: (created: GitHubIssueResponse) => void;
};

const ReportForm: React.FC<ReportFormProps> = ({ context, onSuccess }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const api = ReportsApi.getInstance();
    const { customUser } = useUserContext();

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

            Animated.timing(errorOpacity, {
                toValue: 1,
                duration: 180,
                useNativeDriver: true,
            }).start();

            errorTimerRef.current = setTimeout(() => {
                Animated.timing(errorOpacity, {
                    toValue: 0,
                    duration: 220,
                    useNativeDriver: true,
                }).start(({ finished }) => {
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
                mediaTypes: ["images"] as any,
                quality: 1,
            });
            if (pickerResult.canceled) return;
            const selected = pickerResult.assets[0];
            if (!selected?.uri) return;

            const manipContext = ImageManipulator.ImageManipulator.manipulate(selected.uri);
            manipContext.resize({ width: 1280 });
            const rendered = await manipContext.renderAsync();
            const saved = await rendered.saveAsync({
                format: ImageManipulator.SaveFormat.JPEG,
                compress: 0.9,
            });

            const fileObj = { uri: saved.uri, name: `report-${images.length + 1}.jpg`, type: "image/jpeg" };
            setImages((prev) => [...prev, fileObj]);
        } catch (e) {
            console.error(e);
            Alert.alert("Erreur", "Impossible de traiter l’image.");
        }
    };

    type FormValues = {
        type: ReportType;
        title: string;
        description?: string;
    };

    const formik = useFormik<FormValues>({
        initialValues: {
            type: context?.defaultType ?? ReportType.DISPLAY_BUG,
            title: "",
            description: "",
        },
        validationSchema: Yup.object({
            type: Yup.mixed<ReportType>().oneOf(Object.values(ReportType)).required(),
            title: Yup.string().trim().required("Titre requis"),
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
            } catch (err) {
                console.error(err);
                setApiError("Création impossible, réessaie.");
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
                setLoading(false);
            }
        },
    });

    return (
        <View style={{ flex: 1 }}>
            <BottomSheetScrollView
                contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 88 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Catégorie</Text>
                    <View style={styles.row}>
                        <TouchableOpacity
                            onPress={() => formik.setFieldValue("type", ReportType.DISPLAY_BUG)}
                            style={[
                                styles.chip,
                                {
                                    backgroundColor:
                                        formik.values.type === ReportType.DISPLAY_BUG ? theme.primary : theme.backgroundSecondary,
                                    borderColor: formik.values.type === ReportType.DISPLAY_BUG ? theme.primary : theme.border,
                                },
                            ]}
                        >
                            <MaterialCommunityIcons name="bug-outline" size={16} color={theme.text} />
                            <Text style={[styles.chipText, { color: theme.text }]}>Bug d'affichage</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => formik.setFieldValue("type", ReportType.DATA_ERROR)}
                            style={[
                                styles.chip,
                                {
                                    backgroundColor:
                                        formik.values.type === ReportType.DATA_ERROR ? theme.primary : theme.backgroundSecondary,
                                    borderColor: formik.values.type === ReportType.DATA_ERROR ? theme.primary : theme.border,
                                },
                            ]}
                        >
                            <MaterialCommunityIcons name="database-alert-outline" size={16} color={theme.text} />
                            <Text style={[styles.chipText, { color: theme.text }]}>Données</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => formik.setFieldValue("type", ReportType.OTHER)}
                            style={[
                                styles.chip,
                                {
                                    backgroundColor:
                                        formik.values.type === ReportType.OTHER ? theme.primary : theme.backgroundSecondary,
                                    borderColor: formik.values.type === ReportType.OTHER ? theme.primary : theme.border,
                                },
                            ]}
                        >
                            <MaterialCommunityIcons name="flag-outline" size={16} color={theme.text} />
                            <Text style={[styles.chipText, { color: theme.text }]}>Autre</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Détails</Text>

                    <BottomSheetTextInput
                        style={[
                            styles.input,
                            {
                                borderColor: formik.touched.title && formik.errors.title ? theme.error : theme.border,
                                color: theme.text,
                            },
                        ]}
                        value={formik.values.title}
                        onChangeText={formik.handleChange("title")}
                        onBlur={formik.handleBlur("title")}
                        placeholder="Titre"
                        placeholderTextColor={theme.textInactive}
                    />
                    {formik.touched.title && formik.errors.title ? (
                        <Text style={[styles.errorText, { color: theme.error }]}>{formik.errors.title as string}</Text>
                    ) : null}

                    <BottomSheetTextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text, height: 156 }]}
                        multiline
                        value={formik.values.description}
                        onChangeText={formik.handleChange("description")}
                        placeholder="Description"
                        placeholderTextColor={theme.textInactive}
                    />
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
                        >
                            <MaterialCommunityIcons name="image-plus" size={20} color={theme.textInactive} />
                            <Text style={[styles.addBtnText, { color: theme.textInactive }]}>Ajouter</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </BottomSheetScrollView>

            {/* Bannière d'erreur en absolute + fade */}
            {apiError ? (
                <Animated.View
                    style={[
                        styles.apiErrorContainer,
                        {
                            backgroundColor: theme.error + "22",
                            borderColor: theme.error,
                            bottom: insets.bottom + 64,
                            opacity: errorOpacity,
                            transform: [
                                {
                                    translateY: errorOpacity.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [8, 0], // léger slide
                                    }),
                                },
                            ],
                        },
                    ]}
                    // pour éviter de bloquer les touches dessous
                    pointerEvents="box-none"
                >
                    <MaterialCommunityIcons name="alert-circle-outline" size={18} color={theme.error} />
                    <Text style={[styles.apiErrorText, { color: theme.error }]}>{apiError}</Text>
                </Animated.View>
            ) : null}

            <View
                style={[
                    styles.footer,
                    {
                        paddingBottom: insets.bottom + 8,
                        backgroundColor: theme.backgroundSecondary,
                        borderTopColor: theme.border,
                    },
                ]}
            >
                <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
                    disabled={loading}
                    onPress={() => formik.handleSubmit()}
                >
                    {loading ? (
                        <ActivityIndicator color={theme.text} />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="send" size={18} color={theme.text} />
                            <Text style={[styles.submitText, { color: theme.text }]}>Envoyer</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ReportForm;

const styles = StyleSheet.create({
    scroll: { gap: 12, paddingHorizontal: 8 },
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
    row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
    chip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: CORNERS,
        borderWidth: 1.5,
    },
    chipText: { fontSize: 12, fontWeight: "700" },
    input: {
        borderWidth: 1.5,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 14,
        fontSize: 14,
    },
    errorText: { fontSize: 12, marginTop: -6, marginLeft: 6, fontWeight: "600" },
    thumbWrap: {
        width: 84,
        height: 84,
        borderRadius: 14,
        overflow: "hidden",
        borderWidth: 1.5,
    },
    thumb: { width: "100%", height: "100%" },
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
    footer: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 12,
        paddingTop: 8,
        borderTopWidth: 1,
    },
    submitBtn: {
        borderRadius: CORNERS,
        paddingVertical: 14,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
    },
    submitText: { fontWeight: "800", fontSize: 16 },
});