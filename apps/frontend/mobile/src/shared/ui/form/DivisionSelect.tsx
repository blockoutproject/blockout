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

export type DivisionSelectProps = {
  options: SelectOption[];
  selectedValue?: number | null;
  onSelect: (opt: SelectOption) => void;

  /** UI */
  title?: string;
  placeholderLabel?: string;
  testIDButton?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  clearable?: boolean;
};

const DivisionSelect: React.FC<DivisionSelectProps> = ({
  options,
  selectedValue,
  onSelect,
  title = "Choisir une division",
  placeholderLabel = "Division",
  testIDButton,
  style,
  disabled = false,
  clearable = true,
}) => {
  const theme = useAppTheme();
  const sheetRef = useRef<SelectSheetRef>(null);

  const isDisabled = disabled || options.length === 0;

  const label = useMemo(() => {
    if (selectedValue != null) {
      const match = options.find((opt) => opt.value === selectedValue);
      if (match) return match.label;
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
          styles.divisionBtn,
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
          name="trophy-outline"
          size={16}
          color={theme.textInactive}
        />

        <Text
          style={[styles.divisionText, { color: theme.text }]}
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

export default DivisionSelect;

const styles = StyleSheet.create({
  divisionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 6,
  },
  divisionText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
