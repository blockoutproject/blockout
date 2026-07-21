import React, {useCallback, useMemo, useRef} from "react";
import * as Haptics from "expo-haptics";
import {StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle,} from "react-native";
import {MaterialCommunityIcons} from "@expo/vector-icons";

import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {CORNERS} from "@/src/shared/theme/globals";
import SelectSheet, {SelectOption, SelectSheetRef,} from "@/src/shared/ui/form/SelectSheet";
import {EnumFormat, FormatLabels} from "@/src/types/enums/Format";

export type FormatSelectProps = {
  selectedValue?: EnumFormat | null;
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
      {value: EnumFormat.SIX, label: FormatLabels[EnumFormat.SIX]},
      {value: EnumFormat.FOUR, label: FormatLabels[EnumFormat.FOUR]},
      {value: EnumFormat.TWO, label: FormatLabels[EnumFormat.TWO]},
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
          style={[styles.formatText, {color: theme.text}]}
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
    borderRadius: CORNERS,
    borderWidth: 1,
    gap: 6,
  },
  formatText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
