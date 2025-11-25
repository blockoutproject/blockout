import React, { useCallback, useMemo, useRef } from "react";
import * as Haptics from "expo-haptics";
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ViewStyle,
    StyleProp,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { CORNERS } from "@/src/theme/globals";
import SelectSheet, {
    SelectOption,
    SelectSheetRef,
} from "@/src/components/common/form/SelectSheet";

export type SeasonSelectProps = {
    options: SelectOption[];
    selectedValue?: string | null;
    onSelect: (opt: SelectOption) => void;

    /** UI */
    title?: string;
    placeholderLabel?: string;
    testIDButton?: string;
    style?: StyleProp<ViewStyle>;
    maxWidth?: number;
    disabled?: boolean;
    clearable?: boolean;
};

const SeasonSelect: React.FC<SeasonSelectProps> = ({
    options,
    selectedValue,
    onSelect,
    title = "Choisir une saison",
    placeholderLabel = "Saison",
    testIDButton,
    style,
    maxWidth = 150,
    disabled = false,
    clearable = false,
}) => {
    const theme = useAppTheme();
    const sheetRef = useRef<SelectSheetRef>(null);

    const isDisabled = disabled || options.length === 0;

    const label = useMemo(() => {
        if (selectedValue) return selectedValue;
        if (options.length > 0) {
            const first = options[0];
            return String(first.label ?? first.value);
        }
        return placeholderLabel;
    }, [selectedValue, options, placeholderLabel]);

    const handleOpen = useCallback(async () => {
        if (isDisabled) return;
        await Haptics.selectionAsync();
        sheetRef.current?.present();
    }, [isDisabled]);

    const handleSelect = useCallback(
        (opt: SelectOption) => {
            onSelect(opt);
        },
        [onSelect],
    );

    return (
        <>
            <TouchableOpacity
                onPress={handleOpen}
                activeOpacity={0.8}
                disabled={isDisabled}
                style={[
                    styles.seasonBtn,
                    {
                        borderColor: theme.border,
                        backgroundColor: theme.surface,
                        maxWidth,
                        opacity: isDisabled ? 0.6 : 1,
                    },
                    style,
                ]}
                testID={testIDButton}
            >
                <MaterialCommunityIcons
                    name="calendar-month-outline"
                    size={16}
                    color={theme.textInactive}
                />

                <Text
                    style={[styles.seasonText, { color: theme.text }]}
                    numberOfLines={1}
                >
                    {label}
                </Text>

                <MaterialCommunityIcons
                    name="chevron-down"
                    size={16}
                    color={theme.textInactive}
                />
            </TouchableOpacity>

            <SelectSheet
                ref={sheetRef}
                title={title}
                options={options}
                selectedValue={selectedValue ?? ""}
                onSelect={handleSelect}
                clearable={clearable}
            />
        </>
    );
};

export default SeasonSelect;

const styles = StyleSheet.create({
    seasonBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: CORNERS,
        borderWidth: 1,
        gap: 6,
    },
    seasonText: {
        fontSize: 12,
        fontWeight: "700",
    },
});