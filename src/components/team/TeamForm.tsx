import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, Alert } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useFormik } from "formik";
import * as Yup from "yup";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { Image } from "expo-image";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/context/ThemeProvider";
import type { EnrichedTeamDTO, Team } from "@/src/types/Team";
import { CORNERS } from "@/src/theme/globals";
import ApiErrorToast from "@/src/components/common/feedback/ApiErrorToast";

import FormCard from "@/src/components/common/form/FormCard";
import Field from "@/src/components/common/form/Field";
import { useApis } from "@/src/context/ApiProvider";
import { CustomImage } from "@/src/types/Common";
import SheetTextInput from "../common/form/SheetTextInput";

export type TeamFormExternalState = {
    loading: boolean;
    canSubmit: boolean;
};

export type TeamFormProps = {
    team: EnrichedTeamDTO;
    onSuccess: (updated?: Team) => void;
    onRegisterSubmit: (submit: () => void) => void;
    onStateChange?: (state: TeamFormExternalState) => void;
};

const TeamForm: React.FC<TeamFormProps> = ({ team, onSuccess, onRegisterSubmit, onStateChange }) => {
    const theme = useAppTheme();
    const { mobile } = useApis();

    const [imageFile, setImageFile] = useState<CustomImage | null>(null);
    const [previewUri, setPreviewUri] = useState<string | null>(null);
    const [removedLogo, setRemovedLogo] = useState(false);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    const handlePickImage = async () => {
        try {
            await Haptics.selectionAsync();
            const pickerResult = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ["images"] as unknown as ImagePicker.MediaTypeOptions,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 1,
            });
            if (pickerResult.canceled) return;

            const selected = pickerResult.assets[0];
            if (!selected?.uri) return;

            const manipContext = ImageManipulator.ImageManipulator.manipulate(selected.uri);
            manipContext.resize({ width: 512 });
            const rendered = await manipContext.renderAsync();
            const saved = await rendered.saveAsync({ format: ImageManipulator.SaveFormat.PNG, compress: 1 });

            setPreviewUri(saved.uri);
            setImageFile({ uri: saved.uri, name: "team.png", type: "image/png" });
            setRemovedLogo(false);
        } catch {
            Alert.alert("Erreur", "Impossible de traiter l’image.");
        }
    };

    const handleRemoveImage = async () => {
        await Haptics.selectionAsync();
        setPreviewUri(null);
        setImageFile(null);
        setRemovedLogo(true);
    };

    const formik = useFormik({
        initialValues: {
            name: team.name ?? "",
            shortName: team.shortName ?? "",
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

                const dto: Partial<Team> = {
                    name: values.name.trim(),
                    shortName: values.shortName.trim(),
                };

                if (imageFile) {
                } else if (removedLogo) {
                    dto.logoUrl = null;
                } else if (team.logoUrl) {
                    dto.logoUrl = team.logoUrl;
                }

                const updated = await mobile.teams.updateTeam(team.id, dto, imageFile ?? undefined);
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

    const logoUri = removedLogo ? null : (previewUri ?? team.logoUrl ?? null);

    return (
        <>
            <BottomSheetScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
                <FormCard title="Logo">
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
                                    <MaterialCommunityIcons
                                        name="camera-plus-outline"
                                        size={28}
                                        color={theme.textInactive}
                                    />
                                    <Text style={[styles.logoHint, { color: theme.textInactive }]}>
                                        Ajouter un logo
                                    </Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>

                    <View style={styles.buttonsRow}>
                        <TouchableOpacity
                            onPress={handlePickImage}
                            style={[styles.logoBtn, { backgroundColor: theme.backgroundSecondary }]}
                        >
                            <MaterialCommunityIcons name="pencil-outline" size={16} color={theme.text} />
                            <Text style={[styles.logoBtnText, { color: theme.text }]}>Changer le logo</Text>
                        </TouchableOpacity>

                        {logoUri && (
                            <TouchableOpacity
                                onPress={handleRemoveImage}
                                style={[styles.removeBtn, { backgroundColor: theme.backgroundSecondary }]}
                            >
                                <MaterialCommunityIcons name="trash-can-outline" size={16} color={theme.error} />
                                <Text style={[styles.removeBtnText, { color: theme.error }]}>Supprimer</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </FormCard>

                <FormCard>
                    <Text style={{ color: theme.text, fontWeight: "900" }}>{team.name}</Text>
                </FormCard>

                <FormCard>
                    <Field label="Nom" error={formik.errors.name} touched={formik.touched.name}>
                        <SheetTextInput
                            value={formik.values.name}
                            onChangeText={formik.handleChange("name")}
                            onBlur={formik.handleBlur("name")}
                            placeholder="Nom de l'équipe"
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
                            placeholder="Diminutif de l'équipe"
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
        </>
    );
};

export default TeamForm;

const styles = StyleSheet.create({
    scroll: { gap: 12, padding: 8 },
    logoWrap: {
        borderWidth: 1.5,
        borderRadius: 22,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
    },
    buttonsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    logoMask: {
        width: 110,
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
    removeBtn: {
        alignSelf: "flex-start",
        flexDirection: "row",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: CORNERS,
    },
    removeBtnText: {
        fontSize: 12,
        fontWeight: "700",
    },
});