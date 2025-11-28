import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Text } from "react-native";
import * as Haptics from "expo-haptics";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { useDivisions } from "@/src/hooks/config/division/useDivisions";
import { RawDivisionMapping } from "@/src/types/RawDivisionMapping";
import { EnumFormat, FormatLabels } from "@/src/types/enums/Format";
import { EnumGender, GenderLabels } from "@/src/types/enums/Gender";
import FormSelect from "@/src/components/common/form/FormSelect";
import SelectSheet, { SelectOption, SelectSheetRef } from "@/src/components/common/form/SelectSheet";
import ApiErrorToast from "@/src/components/common/feedback/ApiErrorToast";
import FormCard from "@/src/components/common/form/FormCard";
import { useApis } from "@/src/context/ApiProvider";

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

const RawDivisionMappingForm: React.FC<RawDivisionMappingFormProps> = ({
    mapping,
    onSuccess,
    onRegisterSubmit,
    onStateChange,
}) => {
    const theme = useAppTheme();
    const { data: divisions = [], isLoading: loadingDivisions } = useDivisions();
    const { mobile } = useApis();
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
            await mobile.config.updateRawDivisionMapping(mapping.id, {
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

    return (
        <>
            <BottomSheetScrollView contentContainerStyle={styles.fieldContainer} showsVerticalScrollIndicator={false}>
                <FormCard title="Source">
                    <View style={styles.sourceBlock}>
                        <Text style={[styles.sourceName, { color: theme.text }]} numberOfLines={2}>
                            {mapping.rawDivisionName}
                        </Text>
                        <Text style={{ color: theme.textInactive, fontSize: 12, fontWeight: "600" }}>
                            {mapping.leagueCode} • {mapping.season}
                        </Text>
                    </View>
                </FormCard>

                <FormCard title="Format">
                    <FormSelect label="Format" valueLabel={formatLabel} onPress={() => formatRef.current?.present()} />
                </FormCard>

                <FormCard title="Genre">
                    <FormSelect label="Genre" valueLabel={genderLabel} onPress={() => genderRef.current?.present()} />
                </FormCard>

                <FormCard title="Division">
                    <FormSelect
                        label="Division"
                        valueLabel={divisionLabel}
                        onPress={() => divisionRef.current?.present()}
                        loading={loadingDivisions}
                        disabled={loadingDivisions}
                    />
                </FormCard>
            </BottomSheetScrollView>

            <ApiErrorToast message={apiError} onHidden={() => setApiError(null)} />

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
        </>
    );
};

export default RawDivisionMappingForm;

const styles = StyleSheet.create({
    fieldContainer: { padding: 8, gap: 12 },
    sourceBlock: { gap: 4 },
    sourceName: { fontSize: 16, fontWeight: "700" },
});