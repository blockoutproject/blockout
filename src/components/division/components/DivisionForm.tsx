import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
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

import { useAppTheme } from "@/src/context/ThemeProvider";
import { Division } from "@/src/types/Division";
import ConfigApi from "@/src/api/ConfigApi";
import CircleColorPicker from "@/src/components/common/CircleColorPicker";
import { CORNERS } from "@/src/theme/globals";

type DivisionFormProps = {
    division: Division | null;
    onSuccess: () => void;
};

const DivisionForm: React.FC<DivisionFormProps> = ({ division, onSuccess }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const api = ConfigApi.getInstance();
    const isEditMode = !!division;

    const [imageFile, setImageFile] = useState<{ uri: string; name: string; type: string } | null>(null);
    const [previewUri, setPreviewUri] = useState<string | null>(null);
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
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });

            if (pickerResult.canceled) return;

            const selected = pickerResult.assets[0];
            if (!selected.uri) return;

            const manipContext = ImageManipulator.ImageManipulator.manipulate(selected.uri);
            manipContext.resize({ width: 512 });

            const rendered = await manipContext.renderAsync();
            const saved = await rendered.saveAsync({
                format: ImageManipulator.SaveFormat.JPEG,
                compress: 1,
            });

            const fileObj = { uri: saved.uri, name: "division.jpg", type: "image/jpeg" };
            setPreviewUri(saved.uri);
            setImageFile(fileObj);
        } catch (e) {
            console.error("Erreur image:", e);
            Alert.alert("Erreur", "Impossible de traiter l'image.");
        }
    };

    const formik = useFormik({
        initialValues: {
            name: division?.name ?? "",
            mainColor: division?.mainColor ?? "",
            firstGradientColor: division?.firstGradientColor ?? "",
            secondGradientColor: division?.secondGradientColor ?? "",
            thirdGradientColor: division?.thirdGradientColor ?? "",
            logoUrl: division?.logoUrl ?? "",
        },
        validationSchema: Yup.object({
            name: Yup.string().trim().required("Le nom est requis"),
            mainColor: Yup.string().trim().required("Couleur principale requise"),
            firstGradientColor: Yup.string().trim().required("Première couleur de dégradé requise"),
            secondGradientColor: Yup.string().trim().required("Deuxième couleur de dégradé requise"),
            thirdGradientColor: Yup.string().trim().required("Troisième couleur de dégradé requise"),
        }),
        onSubmit: async (values) => {
            try {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setLoading(true);
                setApiError(null);

                if (isEditMode) {
                    await api.updateDivision(division!.id, values, imageFile ?? undefined);
                } else {
                    await api.createOrUpdateDivision(values, imageFile ?? undefined);
                }

                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onSuccess();
            } catch (error) {
                console.error("Erreur API:", error);
                setApiError("La sauvegarde a échoué. Veuillez réessayer.");
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            } finally {
                setLoading(false);
            }
        },
    });

    const logoUri = previewUri ?? formik.values.logoUrl ?? null;
    const inputBorderColor = (touched?: unknown, error?: unknown) =>
        touched && error ? theme.error : theme.border;

    return (
        <View style={{ flex: 1 }}>
            <BottomSheetScrollView
                contentContainerStyle={[
                    styles.scroll,
                    { paddingBottom: insets.bottom + 88 },
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Logo</Text>
                    <TouchableOpacity
                        onPress={handlePickImage}
                        activeOpacity={0.85}
                        style={[styles.logoWrap, { borderColor: theme.border }]}
                    >
                        <View style={styles.logoMask}>
                            {logoUri ? (
                                <Image source={{ uri: logoUri }} style={styles.logo} contentFit="contain" />
                            ) : (
                                <View style={styles.logoPlaceholder}>
                                    <MaterialCommunityIcons name="camera-plus-outline" size={28} color={theme.textInactive} />
                                    <Text style={[styles.logoHint, { color: theme.textInactive }]}>Ajouter un logo</Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={handlePickImage}
                        style={[styles.logoBtn, { backgroundColor: theme.backgroundSecondary }]}
                    >
                        <MaterialCommunityIcons name="pencil-outline" size={16} color={theme.text} />
                        <Text style={[styles.logoBtnText, { color: theme.text }]}>Changer le logo</Text>
                    </TouchableOpacity>
                </View>

                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Nom</Text>
                    <BottomSheetTextInput
                        style={[
                            styles.input,
                            {
                                borderColor: inputBorderColor(formik.touched.name, formik.errors.name),
                                color: theme.text,
                            },
                        ]}
                        value={formik.values.name}
                        onChangeText={formik.handleChange("name")}
                        onBlur={formik.handleBlur("name")}
                        placeholder="Nom de la division"
                        placeholderTextColor={theme.textInactive}
                    />
                    {formik.touched.name && formik.errors.name ? (
                        <Text style={[styles.errorText, { color: theme.error }]}>{formik.errors.name}</Text>
                    ) : null}
                </View>

                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Couleur principale</Text>
                    <View style={styles.colorRow}>
                        <CircleColorPicker
                            value={formik.values.mainColor}
                            onChange={(color) => formik.setFieldValue("mainColor", color)}
                        />
                    </View>
                </View>

                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Dégradé</Text>
                    <View style={styles.colorRow}>
                        <CircleColorPicker
                            value={formik.values.firstGradientColor}
                            onChange={(color) => formik.setFieldValue("firstGradientColor", color)}
                        />
                        <CircleColorPicker
                            value={formik.values.secondGradientColor}
                            onChange={(color) => formik.setFieldValue("secondGradientColor", color)}
                        />
                        <CircleColorPicker
                            value={formik.values.thirdGradientColor}
                            onChange={(color) => formik.setFieldValue("thirdGradientColor", color)}
                        />
                    </View>
                </View>
            </BottomSheetScrollView>

            {/* Erreur Absolute + Fade */}
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
                                        outputRange: [8, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
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
                    style={[
                        styles.submitBtn,
                        { backgroundColor: formik.values.mainColor || theme.primary, opacity: loading ? 0.7 : 1 },
                    ]}
                    disabled={loading}
                    onPress={() => formik.handleSubmit()}
                >
                    {loading ? (
                        <ActivityIndicator color={theme.text} />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="content-save-outline" size={18} color={theme.text} />
                            <Text style={[styles.submitText, { color: theme.text }]}>
                                {isEditMode ? (!division?.active ? "Réactiver" : "Modifier") : "Créer"}
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default DivisionForm;

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
    input: {
        borderWidth: 1.5,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 14,
        fontSize: 14,
    },
    errorText: { fontSize: 12, marginTop: 6, marginLeft: 6, fontWeight: "600" },
    colorRow: { flexDirection: "row", gap: 16, marginTop: 8, marginLeft: 8 },
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