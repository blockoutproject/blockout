import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/src/context/ThemeProvider";
import BottomSheetCustomModal from "./BottomSheetCustomModal";
import { TABBAR_HEIGHT } from "@/src/theme/globals";

export type SelectOption = {
    /** Valeur renvoyée au choix. */
    value: string | number;
    /** Libellé affiché. */
    label: string;
};

export type SelectSheetProps = {
    /** Titre en haut de la feuille. */
    title: string;
    /** Options proposées. */
    options: SelectOption[];
    /** Valeur actuellement sélectionnée. */
    selectedValue?: string | number | "";
    /** Callback lors de la sélection. */
    onSelect: (option: SelectOption) => void;
    /** Active le bouton de réinitialisation. */
    clearable?: boolean;
    /** Libellé du bouton de réinitialisation. */
    clearLabel?: string;
};

export type SelectSheetRef = {
    present: () => void;
    dismiss: () => void;
};

const SelectSheet = forwardRef<SelectSheetRef, SelectSheetProps>(
    ({ title, options, selectedValue, onSelect, clearable = true, clearLabel = "Réinitialiser" }, ref) => {
        const theme = useAppTheme();
        const insets = useSafeAreaInsets();
        const sheetRef = useRef<BottomSheetModal>(null);

        useImperativeHandle(ref, () => ({
            present: () => sheetRef.current?.present(),
            dismiss: () => sheetRef.current?.dismiss(),
        }));

        const data = useMemo(() => options, [options]);

        const handleSelect = async (opt: SelectOption) => {
            await Haptics.selectionAsync();
            onSelect(opt);
            sheetRef.current?.dismiss();
        };

        const handleClear = () => {
            Haptics.selectionAsync();
            onSelect({ value: "", label: "" });
            sheetRef.current?.dismiss();
        };

        const renderItem = ({ item }: { item: SelectOption }) => {
            const isSelected = item.value === selectedValue;
            return (
                <Pressable
                    onPress={() => handleSelect(item)}
                    style={({ pressed }) => [
                        styles.row,
                        { backgroundColor: pressed ? theme.backgroundSecondary : "transparent" },
                    ]}
                >
                    <Text
                        numberOfLines={1}
                        style={[
                            styles.rowLabel,
                            { color: theme.text, fontWeight: (isSelected ? "800" : "600") as "800" | "600" },
                        ]}
                    >
                        {item.label}
                    </Text>
                    {isSelected ? <MaterialIcons name="check" size={18} color={theme.text} /> : null}
                </Pressable>
            );
        };

        return (
            <BottomSheetCustomModal ref={sheetRef}>
                <BottomSheetView>
                    <View style={[styles.header, { borderColor: theme.border }]}>
                        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                            {title}
                        </Text>

                        {clearable ? (
                            <Pressable onPress={handleClear} hitSlop={8} style={styles.clearBtn}>
                                <MaterialIcons name="close" size={16} color={theme.textInactive} />
                                <Text style={[styles.clearText, { color: theme.textInactive }]} numberOfLines={1}>
                                    {clearLabel}
                                </Text>
                            </Pressable>
                        ) : (
                            <View style={styles.clearSpacer} />
                        )}
                    </View>

                    <FlatList
                        data={data}
                        keyExtractor={(it) => String(it.value)}
                        renderItem={renderItem}
                        contentContainerStyle={{ paddingBottom: insets.bottom + TABBAR_HEIGHT }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    />
                </BottomSheetView>
            </BottomSheetCustomModal>
        );
    }
);

export default SelectSheet;

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 8,
    },
    title: {
        fontSize: 14,
        fontWeight: "800",
        textTransform: "uppercase",
        letterSpacing: 0.3,
        flexShrink: 1,
    },
    clearBtn: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        padding: 6,
    },
    clearText: {
        fontSize: 12,
        fontWeight: "700",
    },
    clearSpacer: {
        width: 1,
    },
    row: {
        paddingHorizontal: 12,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    rowLabel: {
        fontSize: 14,
    },
});