import React, { useImperativeHandle, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BottomSheetFlatList, BottomSheetModal } from "@gorhom/bottom-sheet";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  borderWidth,
  iconSize,
  layout,
  radius,
  spacing,
  stateOpacity,
  touchTarget,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import BottomSheetCustomPage from "@/src/shared/ui/bottom-sheet/bottom-sheet-custom-page";

export type SelectValue = string | number;

export type SelectOption<Value extends SelectValue = SelectValue> = {
  value: Value;
  label: string;
};

export type SelectSheetRef = {
  present: () => void;
  dismiss: () => void;
};

export type SelectSheetProps<Value extends SelectValue> = {
  title: string;
  options: readonly SelectOption<Value>[];
  selectedValue?: Value | null;
  onSelect: (option: SelectOption<Value>) => void;
  onClear?: () => void;
  clearLabel?: string;
  ref?: React.Ref<SelectSheetRef>;
};

/**
 * Presents a sorted, value-typed option list inside the canonical bottom sheet.
 */
export default function SelectSheet<Value extends SelectValue>({
  title,
  options,
  selectedValue,
  onSelect,
  onClear,
  clearLabel = "Réinitialiser",
  ref,
}: SelectSheetProps<Value>) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheetModal>(null);

  useImperativeHandle(ref, () => ({
    present: () => sheetRef.current?.present(),
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const data = useMemo(
    () =>
      [...options].sort((a, b) =>
        a.label.localeCompare(b.label, "fr", { sensitivity: "base" }),
      ),
    [options],
  );

  const handleSelect = async (option: SelectOption<Value>) => {
    await Haptics.selectionAsync().catch(() => undefined);
    onSelect(option);
    sheetRef.current?.dismiss();
  };

  const handleClear = async () => {
    await Haptics.selectionAsync().catch(() => undefined);
    onClear?.();
    sheetRef.current?.dismiss();
  };

  const renderItem = ({ item }: { item: SelectOption<Value> }) => {
    const isSelected = item.value === selectedValue;

    return (
      <Pressable
        onPress={() => handleSelect(item)}
        accessibilityRole="button"
        accessibilityLabel={item.label}
        accessibilityState={{ selected: isSelected }}
        style={({ pressed }) => [
          styles.row,
          {
            borderColor: isSelected ? theme.borderSecondary : theme.border,
            backgroundColor:
              pressed || isSelected ? theme.backgroundSecondary : theme.surface,
            opacity: pressed ? stateOpacity.pressed : 1,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.rowLabel,
            isSelected ? styles.selectedLabel : undefined,
            { color: theme.text },
          ]}
        >
          {item.label}
        </Text>
        {isSelected ? (
          <MaterialIcons name="check" size={iconSize.md} color={theme.text} />
        ) : null}
      </Pressable>
    );
  };

  return (
    <BottomSheetCustomPage ref={sheetRef}>
      <View>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {title}
          </Text>

          {onClear ? (
            <Pressable
              onPress={handleClear}
              accessibilityRole="button"
              accessibilityLabel={clearLabel}
              style={({ pressed }) => [
                styles.clearAction,
                { opacity: pressed ? stateOpacity.pressed : 1 },
              ]}
            >
              <MaterialIcons
                name="close"
                size={iconSize.sm}
                color={theme.textInactive}
              />
              <Text
                style={[styles.clearText, { color: theme.textInactive }]}
                numberOfLines={1}
              >
                {clearLabel}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.clearSpacer} />
          )}
        </View>

        <BottomSheetFlatList
          data={data}
          keyExtractor={(item: SelectOption<Value>) => String(item.value)}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingBottom: insets.bottom + layout.tabs,
            paddingHorizontal: spacing[2],
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      </View>
    </BottomSheetCustomPage>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: touchTarget.minimum,
    paddingHorizontal: spacing[3],
    borderBottomWidth: borderWidth.thin,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2],
  },
  title: {
    ...typography.compactStrong,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  clearAction: {
    minHeight: touchTarget.minimum,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    paddingHorizontal: spacing[2],
  },
  clearText: {
    ...typography.metadataStrong,
  },
  clearSpacer: {
    width: spacing[1],
  },
  row: {
    minHeight: touchTarget.minimum,
    paddingHorizontal: spacing[3],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: radius.md,
    borderCurve: "continuous",
    borderWidth: borderWidth.thin,
    marginVertical: spacing[1],
  },
  rowLabel: {
    ...typography.body,
    flexShrink: 1,
  },
  selectedLabel: {
    ...typography.compactStrong,
  },
});
