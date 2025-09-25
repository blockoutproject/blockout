import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useAppTheme } from "@/src/context/ThemeProvider";
import ConfigApi from "@/src/api/ConfigApi";
import { useDivisions } from "@/src/hooks/config/division/useDivisions";
import { RawDivisionMapping } from "@/src/types/RawDivisionMapping";
import { EnumFormat, FormatLabels } from "@/src/types/enums/Format";
import { EnumGender, GenderLabels } from "@/src/types/enums/Gender";
import { CORNERS } from "@/src/theme/globals";
import FormSelect from "@/src/components/common/form/FormSelect";
import SelectSheet, { SelectOption, SelectSheetRef } from "@/src/components/common/bottomSheet/SelectSheet";
import useKeyboardVisible from "@/src/hooks/utils/useKeyboardVisible";
import ApiErrorToast from "@/src/components/common/feedback/ApiErrorToast";

export type RawDivisionMappingFormExternalState = {
    loading: boolean;
    canSubmit: boolean;
};

export type RawDivisionMappingFormProps = {
    mapping: RawDivisionMapping;
    onSuccess: () => void;
    onRegisterSubmit: (submit: () => void) => void;
    onStateChange?: (state: RawDivisionMappingFormExternalState) => void;
};

const FOOTER_SPACE = 60;

const RawDivisionMappingForm: React.FC<RawDivisionMappingFormProps> = ({
    mapping,
    onSuccess,
    onRegisterSubmit,
    onStateChange,
}) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();
    const isKeyboardVisible = useKeyboardVisible();
    const { data: divisions = [], isLoading: loadingDivisions } = useDivisions();

    const [divisionId, setDivisionId] = useState<number | "">(mapping.divisionId ?? "");
    const [format, setFormat] = useState<EnumFormat | "">(mapping.format ?? "");
    const [gender, setGender] = useState<EnumGender | "">(mapping.gender ?? "");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

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
        } catch {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setApiError("Une erreur est survenue lors de la sauvegarde.");
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        onRegisterSubmit(handleSubmit);
    }, [divisionId, format, gender, onRegisterSubmit]);

    useEffect(() => {
        onStateChange?.({ loading: isSubmitting, canSubmit: !isSubmitting });
    }, [isSubmitting, onStateChange]);

    const outerPaddingBottom = isKeyboardVisible ? 8 : insets.bottom + 8;

    return (
        <View style={{ flex: 1, paddingBottom: outerPaddingBottom }}>
            <BottomSheetScrollView
                contentContainerStyle={[styles.fieldContainer, { paddingBottom: FOOTER_SPACE + outerPaddingBottom }]}
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

            <ApiErrorToast
                message={apiError}
                bottomOffset={FOOTER_SPACE + outerPaddingBottom}
                onHidden={() => setApiError(null)}
            />

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
        opacity: 0.85 
    },
    sourceBlock: { gap: 4 },
    sourceName: { fontSize: 16, fontWeight: "700" },
    sourceMeta: { fontSize: 12, fontWeight: "600" },
});