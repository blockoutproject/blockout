import React, { useCallback, useMemo, useRef } from "react";
import * as Haptics from "expo-haptics";
import {
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  ViewStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { radius, useAppTheme } from "@/src/shared/theme";

import SelectSheet, {
  SelectOption,
  SelectSheetRef,
} from "@/src/shared/ui/form/SelectSheet";
import { FormatEnum, FormatLabels } from "@/src/shared/model/formatLabels";

export type FormatSelectProps = {
  selectedValue?: FormatEnum | null;
  onSelect: (opt: SelectOption) => void;

  /** UI */
  title?: string;
  placeholderLabel?: string;
  testIDButton?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  clearable?: boolean;
};

const FormatSelect: React.FC<FormatSelectProps> = ({
  selectedValue,
  onSelect,
  title = "Choisir un format",
  placeholderLabel = "Format",
  testIDButton,
  style,
  disabled = false,
  clearable = true,
}) => {
  const theme = useAppTheme();
  const sheetRef = useRef<SelectSheetRef>(null);

  const options: SelectOption[] = useMemo(
    () => [
      { value: FormatEnum.SIX, label: FormatLabels[FormatEnum.SIX] },
      { value: FormatEnum.FOUR, label: FormatLabels[FormatEnum.FOUR] },
      { value: FormatEnum.TWO, label: FormatLabels[FormatEnum.TWO] },
    ],
    [],
  );

  const isDisabled = disabled || options.length === 0;

  const label = useMemo(() => {
    if (selectedValue) {
      const found = options.find((opt) => opt.value === selectedValue);
      if (found) return found.label;
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
          styles.formatBtn,
          {
            borderColor: theme.border,
            backgroundColor: theme.surface,
            opacity: isDisabled ? 0.6 : 1,
          },
          style,
        ]}
        testID={testIDButton}
      >
        <MaterialCommunityIcons
          name="account-group-outline"
          size={16}
          color={theme.textInactive}
        />

        <Text
          style={[styles.formatText, { color: theme.text }]}
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

export default FormatSelect;

const styles = StyleSheet.create({
  formatBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 6,
  },
  formatText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
