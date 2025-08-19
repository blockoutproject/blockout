import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/context/ThemeProvider";
import ConfigApi from "@/src/api/ConfigApi";
import { useDivisions } from "@/src/hooks/config/division/useDivisions";
import { RawDivisionMapping } from "@/src/types/RawDivisionMapping";
import { EnumFormat, FormatLabels } from "@/src/types/enums/Format";
import { EnumGender, GenderLabels } from "@/src/types/enums/Gender";
import { CORNERS } from "@/src/theme/globals";

import FormSelect from "@/src/components/common/FormSelect";
import SelectSheet, { SelectOption, SelectSheetRef } from "@/src/components/common/SelectSheet";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";

export type RawDivisionMappingFormProps = {
    mapping: RawDivisionMapping;
    onSuccess: () => void;
};

const RawDivisionMappingForm: React.FC<RawDivisionMappingFormProps> = ({ mapping, onSuccess }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const { data: divisions = [], isLoading: loadingDivisions } = useDivisions();

    const [divisionId, setDivisionId] = useState<number | "">(mapping.divisionId ?? "");
    const [format, setFormat] = useState<EnumFormat | "">(mapping.format ?? "");
    const [gender, setGender] = useState<EnumGender | "">(mapping.gender ?? "");
    const [isSubmitting, setIsSubmitting] = useState(false);
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

    const formatOptions: SelectOption[] = useMemo(
        () => Object.values(EnumFormat).map((val) => ({ value: val, label: FormatLabels[val] })),
        []
    );
    const genderOptions: SelectOption[] = useMemo(
        () => Object.values(EnumGender).map((val) => ({ value: val, label: GenderLabels[val] })),
        []
    );
    const divisionOptions: SelectOption[] = useMemo(
        () => divisions.filter((d) => d.active).map((d) => ({ value: d.id, label: d.name })),
        [divisions]
    );

    const formatLabel = format ? FormatLabels[format] : null;
    const genderLabel = gender ? GenderLabels[gender] : null;
    const divisionLabel = divisionId ? divisionOptions.find((o) => o.value === divisionId)?.label ?? null : null;

    const formatRef = useRef<SelectSheetRef>(null);
    const genderRef = useRef<SelectSheetRef>(null);
    const divisionRef = useRef<SelectSheetRef>(null);

    const handleSubmit = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsSubmitting(true);
        setApiError(null);

        try {
            await ConfigApi.getInstance().updateRawDivisionMapping(mapping.id, {
                divisionId: divisionId === "" ? null : divisionId,
                format: format === "" ? null : format,
                gender: gender === "" ? null : gender,
            });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSuccess();
        } catch (e) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setApiError("Une erreur est survenue lors de la sauvegarde.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <BottomSheetScrollView
                contentContainerStyle={[styles.fieldContainer, { paddingBottom: insets.bottom + 88 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Source</Text>
                    <View style={styles.sourceBlock}>
                        <Text style={[styles.sourceName, { color: theme.text }]} numberOfLines={2}>
                            {mapping.rawDivisionName}
                        </Text>
                        <Text style={[styles.sourceMeta, { color: theme.textInactive }]}>
                            {mapping.leagueCode} • {mapping.season}
                        </Text>
                    </View>
                </View>

                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Format</Text>
                    <FormSelect label="Format" valueLabel={formatLabel} onPress={() => formatRef.current?.present()} />
                </View>

                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Genre</Text>
                    <FormSelect label="Genre" valueLabel={genderLabel} onPress={() => genderRef.current?.present()} />
                </View>

                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Division</Text>
                    <FormSelect
                        label="Division"
                        valueLabel={divisionLabel}
                        onPress={() => divisionRef.current?.present()}
                        loading={loadingDivisions}
                        disabled={loadingDivisions}
                    />
                </View>
            </BottomSheetScrollView>

            {/* Bannière d’erreur absolute + fade */}
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
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                    activeOpacity={0.85}
                    style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: isSubmitting ? 0.7 : 1 }]}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color={theme.text} />
                    ) : (
                        <>
                            <MaterialCommunityIcons name="content-save-outline" size={18} color={theme.text} />
                            <Text style={[styles.submitText, { color: theme.text }]}>Enregistrer</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>

            <SelectSheet
                ref={formatRef}
                title="Choisir un format"
                options={formatOptions}
                selectedValue={format || ""}
                onSelect={(opt) => setFormat((opt.value as EnumFormat) || "")}
            />
            <SelectSheet
                ref={genderRef}
                title="Choisir un genre"
                options={genderOptions}
                selectedValue={gender || ""}
                onSelect={(opt) => setGender((opt.value as EnumGender) || "")}
            />
            <SelectSheet
                ref={divisionRef}
                title="Choisir une division"
                options={divisionOptions}
                selectedValue={divisionId || ""}
                onSelect={(opt) => setDivisionId((opt.value as number) || "")}
            />
        </View>
    );
};

export default RawDivisionMappingForm;

const styles = StyleSheet.create({
    fieldContainer: { padding: 8, gap: 12 },
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
    sourceBlock: { gap: 4 },
    sourceName: { fontSize: 16, fontWeight: "700" },
    sourceMeta: { fontSize: 12, fontWeight: "600" },
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