import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetScrollView, BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useFormik } from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "expo-image";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Device from "expo-device";
import * as Application from "expo-application";

import { useAppTheme } from "@/src/context/ThemeProvider";
import ReportsApi from "@/src/api/ReportsApi";
import { CORNERS } from "@/src/theme/globals";
import {
    ReportType,
    type Report,
    type DisplayBug,
    type DataError,
    type GitHubIssueResponse,
} from "@/src/types/Report";
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
    const { width, height } = Dimensions.get("window");

    const [images, setImages] = useState<{ uri: string; name: string; type: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const viewport = `${width}x${height}`;

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
        appVersion?: string;
        userId?: string;
        displayBug?: DisplayBug;
        dataError?: DataError;
    };

    const formik = useFormik<FormValues>({
        initialValues: {
            type: context?.defaultType ?? ReportType.DISPLAY_BUG,
            title: "",
            description: "",
            appVersion: Application.nativeApplicationVersion ?? "Unknown",
            userId: customUser?.id.toString() ?? "",
            displayBug: {
                screen: context?.screen ?? "",
                deviceModel: Device.modelName ?? "",
                os: `${Device.osName} ${Device.osVersion}`,
                stepsToReproduce: "",
                expected: "",
                actual: "",
                uiTheme: "Dark",
                viewport: viewport ?? "Unknown",
            },
            dataError: {
                reference: "",
                field: "",
                currentValue: "",
                expectedValue: "",
                sourceLink: "",
                context: "",
            },
        },
        validationSchema: Yup.object({
            type: Yup.mixed<ReportType>().oneOf(Object.values(ReportType)).required(),
            title: Yup.string().trim().required("Titre requis"),
            displayBug: Yup.object().when("type", {
                is: ReportType.DISPLAY_BUG,
                then: (s) =>
                    s.shape({
                        screen: Yup.string().trim().required("Écran requis"),
                    }),
            }),
            dataError: Yup.object().when("type", {
                is: ReportType.DATA_ERROR,
                then: (s) =>
                    s.shape({
                        reference: Yup.string().trim().required("Référence requise"),
                    }),
            }),
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
                    appVersion: values.appVersion || undefined,
                    userId: values.userId || undefined,
                    displayBug:
                        values.type === ReportType.DISPLAY_BUG
                            ? {
                                screen: values.displayBug?.screen ?? "",
                                deviceModel: values.displayBug?.deviceModel || undefined,
                                os: values.displayBug?.os || undefined,
                                stepsToReproduce: values.displayBug?.stepsToReproduce || undefined,
                                expected: values.displayBug?.expected || undefined,
                                actual: values.displayBug?.actual || undefined,
                                uiTheme: values.displayBug?.uiTheme || undefined,
                                viewport: values.displayBug?.viewport || undefined,
                            }
                            : undefined,
                    dataError:
                        values.type === ReportType.DATA_ERROR
                            ? {
                                reference: values.dataError?.reference ?? "",
                                field: values.dataError?.field || undefined,
                                currentValue: values.dataError?.currentValue || undefined,
                                expectedValue: values.dataError?.expectedValue || undefined,
                                sourceLink: values.dataError?.sourceLink || undefined,
                                context: values.dataError?.context || undefined,
                            }
                            : undefined,
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

    const isDisplayBug = formik.values.type === ReportType.DISPLAY_BUG;

    return (
        <BottomSheetScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom }]}
            showsVerticalScrollIndicator={false}
        >
            {/* --- Type de report --- */}
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Type</Text>
                <View style={styles.row}>
                    <TouchableOpacity
                        onPress={() => formik.setFieldValue("type", ReportType.DISPLAY_BUG)}
                        style={[
                            styles.chip,
                            {
                                backgroundColor: isDisplayBug ? theme.primary : theme.backgroundSecondary,
                                borderColor: isDisplayBug ? theme.primary : theme.border,
                            },
                        ]}
                    >
                        <MaterialIcons name="bug-report" size={16} color={theme.text} />
                        <Text style={[styles.chipText, { color: theme.text }]}>UI / Affichage</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => formik.setFieldValue("type", ReportType.DATA_ERROR)}
                        style={[
                            styles.chip,
                            {
                                backgroundColor: !isDisplayBug ? theme.primary : theme.backgroundSecondary,
                                borderColor: !isDisplayBug ? theme.primary : theme.border,
                            },
                        ]}
                    >
                        <MaterialIcons name="fact-check" size={16} color={theme.text} />
                        <Text style={[styles.chipText, { color: theme.text }]}>Donnée</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* --- Détails --- */}
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
                    style={[styles.input, { borderColor: theme.border, color: theme.text, height: 96 }]}
                    multiline
                    value={formik.values.description}
                    onChangeText={formik.handleChange("description")}
                    placeholder="Description"
                    placeholderTextColor={theme.textInactive}
                />
            </View>

            {/* --- Section spécifique --- */}
            {isDisplayBug ? (
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Contexte écran</Text>

                    <BottomSheetTextInput
                        style={[
                            styles.input,
                            {
                                borderColor:
                                    (formik.touched.displayBug as any)?.screen && (formik.errors.displayBug as any)?.screen
                                        ? theme.error
                                        : theme.border,
                                color: theme.text,
                            },
                        ]}
                        value={formik.values.displayBug?.screen ?? ""}
                        onChangeText={(v) => formik.setFieldValue("displayBug.screen", v)}
                        onBlur={() => formik.setFieldTouched("displayBug.screen", true)}
                        placeholder="Écran"
                        placeholderTextColor={theme.textInactive}
                    />

                    {/* deviceModel et os sont préremplis et cachés */}
                    <BottomSheetTextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text, height: 96 }]}
                        multiline
                        value={formik.values.displayBug?.stepsToReproduce ?? ""}
                        onChangeText={(v) => formik.setFieldValue("displayBug.stepsToReproduce", v)}
                        placeholder="Étapes de reproduction"
                        placeholderTextColor={theme.textInactive}
                    />
                    <BottomSheetTextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                        value={formik.values.displayBug?.expected ?? ""}
                        onChangeText={(v) => formik.setFieldValue("displayBug.expected", v)}
                        placeholder="Attendu"
                        placeholderTextColor={theme.textInactive}
                    />
                    <BottomSheetTextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                        value={formik.values.displayBug?.actual ?? ""}
                        onChangeText={(v) => formik.setFieldValue("displayBug.actual", v)}
                        placeholder="Observé"
                        placeholderTextColor={theme.textInactive}
                    />
                    <BottomSheetTextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                        value={formik.values.displayBug?.uiTheme ?? ""}
                        onChangeText={(v) => formik.setFieldValue("displayBug.uiTheme", v)}
                        placeholder="Thème UI"
                        placeholderTextColor={theme.textInactive}
                    />
                    <BottomSheetTextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                        value={formik.values.displayBug?.viewport ?? ""}
                        onChangeText={(v) => formik.setFieldValue("displayBug.viewport", v)}
                        placeholder="Viewport"
                        placeholderTextColor={theme.textInactive}
                    />
                </View>
            ) : (
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Erreur de donnée</Text>

                    <BottomSheetTextInput
                        style={[
                            styles.input,
                            {
                                borderColor:
                                    (formik.touched.dataError as any)?.reference && (formik.errors.dataError as any)?.reference
                                        ? theme.error
                                        : theme.border,
                                color: theme.text,
                            },
                        ]}
                        value={formik.values.dataError?.reference ?? ""}
                        onChangeText={(v) => formik.setFieldValue("dataError.reference", v)}
                        onBlur={() => formik.setFieldTouched("dataError.reference", true)}
                        placeholder="Référence"
                        placeholderTextColor={theme.textInactive}
                    />
                    {(formik.touched.dataError as any)?.reference && (formik.errors.dataError as any)?.reference ? (
                        <Text style={[styles.errorText, { color: theme.error }]}>
                            {(formik.errors.dataError as any)?.reference as string}
                        </Text>
                    ) : null}

                    <BottomSheetTextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                        value={formik.values.dataError?.field ?? ""}
                        onChangeText={(v) => formik.setFieldValue("dataError.field", v)}
                        placeholder="Champ"
                        placeholderTextColor={theme.textInactive}
                    />
                    <BottomSheetTextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                        value={formik.values.dataError?.currentValue ?? ""}
                        onChangeText={(v) => formik.setFieldValue("dataError.currentValue", v)}
                        placeholder="Valeur actuelle"
                        placeholderTextColor={theme.textInactive}
                    />
                    <BottomSheetTextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                        value={formik.values.dataError?.expectedValue ?? ""}
                        onChangeText={(v) => formik.setFieldValue("dataError.expectedValue", v)}
                        placeholder="Valeur attendue"
                        placeholderTextColor={theme.textInactive}
                    />
                    <BottomSheetTextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text }]}
                        value={formik.values.dataError?.sourceLink ?? ""}
                        onChangeText={(v) => formik.setFieldValue("dataError.sourceLink", v)}
                        placeholder="Lien source"
                        placeholderTextColor={theme.textInactive}
                    />
                    <BottomSheetTextInput
                        style={[styles.input, { borderColor: theme.border, color: theme.text, height: 96 }]}
                        multiline
                        value={formik.values.dataError?.context ?? ""}
                        onChangeText={(v) => formik.setFieldValue("dataError.context", v)}
                        placeholder="Contexte"
                        placeholderTextColor={theme.textInactive}
                    />
                </View>
            )}

            {/* --- Captures --- */}
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
                        <MaterialIcons name="add-photo-alternate" size={22} color={theme.textInactive} />
                        <Text style={[styles.addBtnText, { color: theme.textInactive }]}>Ajouter</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {apiError ? (
                <View
                    style={[
                        styles.apiErrorContainer,
                        { backgroundColor: theme.error + "22", borderColor: theme.error },
                    ]}
                >
                    <MaterialIcons name="error-outline" size={18} color={theme.error} />
                    <Text style={[styles.apiErrorText, { color: theme.error }]}>{apiError}</Text>
                </View>
            ) : null}

            <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
                disabled={loading}
                onPress={() => formik.handleSubmit()}
            >
                {loading ? (
                    <ActivityIndicator color={theme.text} />
                ) : (
                    <Text style={[styles.submitText, { color: theme.text }]}>Créer l’issue</Text>
                )}
            </TouchableOpacity>
        </BottomSheetScrollView>
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
    row: { flexDirection: "row", gap: 10 },
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
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 2,
        gap: 8,
    },
    apiErrorText: { flex: 1, fontSize: 14, fontWeight: "600" },
    submitBtn: { borderRadius: CORNERS, paddingVertical: 14, alignItems: "center", marginTop: 4 },
    submitText: { fontWeight: "800", fontSize: 16 },
});