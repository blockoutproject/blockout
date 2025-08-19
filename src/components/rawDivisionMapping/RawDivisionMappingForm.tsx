import React, { useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BottomSheetView } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

import { useAppTheme } from "@/src/context/ThemeProvider";
import ConfigApi from "@/src/api/ConfigApi";
import { useDivisions } from "@/src/hooks/config/division/useDivisions";
import { RawDivisionMapping } from "@/src/types/RawDivisionMapping";
import { EnumFormat, FormatLabels } from "@/src/types/enums/Format";
import { EnumGender, GenderLabels } from "@/src/types/enums/Gender";
import { CORNERS } from "@/src/theme/globals";

import FormSelect from "@/src/components/common/FormSelect";
import SelectSheet, { SelectOption, SelectSheetRef } from "@/src/components/common/SelectSheet";

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

    // --- Options
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

    // --- Sheets refs
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
        <BottomSheetView
            style={[
                styles.container,
                { backgroundColor: theme.backgroundSecondary, paddingBottom: insets.bottom },
            ]}
        >
            <View style={styles.fieldContainer}>
                {/* --- Carte: Source --- */}
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

                {/* --- Carte: Format --- */}
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Format</Text>
                    <FormSelect
                        label="Format"
                        valueLabel={formatLabel}
                        onPress={() => formatRef.current?.present()}
                    />
                </View>

                {/* --- Carte: Genre --- */}
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Genre</Text>
                    <FormSelect
                        label="Genre"
                        valueLabel={genderLabel}
                        onPress={() => genderRef.current?.present()}
                    />
                </View>

                {/* --- Carte: Division --- */}
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
            </View>

            {/* --- Erreur API --- */}
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

            {/* --- Bouton --- */}
            <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.85}
                style={[
                    styles.submitBtn,
                    { backgroundColor: theme.success, opacity: isSubmitting ? 0.7 : 1 },
                ]}
            >
                {isSubmitting ? (
                    <ActivityIndicator color={theme.text} />
                ) : (
                    <Text style={[styles.submitText, { color: theme.text }]}>Enregistrer</Text>
                )}
            </TouchableOpacity>

            {/* --- Sheets (allégées : pas de recherche) --- */}
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
        </BottomSheetView>
    );
};

export default RawDivisionMappingForm;

const styles = StyleSheet.create({
    container: { padding: 8 },
    fieldContainer: { marginBottom: 32, gap: 12 },
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
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginTop: 6,
        gap: 8,
    },
    apiErrorText: { flex: 1, fontSize: 14, fontWeight: "600" },
    submitBtn: { borderRadius: CORNERS, paddingVertical: 14, alignItems: "center" },
    submitText: { fontWeight: "800", fontSize: 16 },
});