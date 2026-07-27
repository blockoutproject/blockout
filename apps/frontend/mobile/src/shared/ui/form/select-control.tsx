import React, { useCallback, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import {
  borderWidth,
  iconSize,
  radius,
  spacing,
  stateOpacity,
  touchTarget,
  typography,
  useAppTheme,
} from "@/src/shared/theme";
import SelectSheet, {
  type SelectOption,
  type SelectSheetRef,
  type SelectValue,
} from "@/src/shared/ui/form/select-sheet";

export type SelectControlProps<Value extends SelectValue> = {
  title: string;
  placeholder: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  options: readonly SelectOption<Value>[];
  selectedValue: Value | null;
  onValueChange: (value: Value | null) => void;
  testID?: string;
};

/**
 * Owns the shared trigger and sheet interaction for a typed select value.
 */
export function SelectControl<Value extends SelectValue>({
  title,
  placeholder,
  icon,
  options,
  selectedValue,
  onValueChange,
  testID,
}: SelectControlProps<Value>) {
  const theme = useAppTheme();
  const sheetRef = useRef<SelectSheetRef>(null);
  const isDisabled = options.length === 0;

  const label = useMemo(
    () =>
      options.find((option) => option.value === selectedValue)?.label ??
      placeholder,
    [options, placeholder, selectedValue],
  );

  const handleOpen = useCallback(async () => {
    if (isDisabled) return;
    await Haptics.selectionAsync().catch(() => undefined);
    sheetRef.current?.present();
  }, [isDisabled]);

  return (
    <>
      <Pressable
        onPress={handleOpen}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityValue={{ text: label }}
        accessibilityState={{ disabled: isDisabled }}
        style={({ pressed }) => [
          styles.trigger,
          {
            borderColor: theme.border,
            backgroundColor: pressed
              ? theme.backgroundSecondary
              : theme.surface,
            opacity: isDisabled
              ? stateOpacity.disabled
              : pressed
                ? stateOpacity.pressed
                : 1,
          },
        ]}
        testID={testID}
      >
        <MaterialCommunityIcons
          name={icon}
          size={iconSize.sm}
          color={theme.textInactive}
        />
        <Text style={[styles.label, { color: theme.text }]} numberOfLines={1}>
          {label}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={iconSize.sm}
          color={theme.textInactive}
        />
      </Pressable>

      <SelectSheet
        ref={sheetRef}
        title={title}
        options={options}
        selectedValue={selectedValue}
        onSelect={(option) => onValueChange(option.value)}
        onClear={() => onValueChange(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minHeight: touchTarget.minimum,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
    borderCurve: "continuous",
    borderWidth: borderWidth.thin,
    gap: spacing[2],
  },
  label: {
    ...typography.metadataStrong,
  },
});
