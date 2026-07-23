import React, {useCallback, useMemo, useRef} from "react";
import * as Haptics from "expo-haptics";
import {StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle,} from "react-native";
import {MaterialCommunityIcons} from "@expo/vector-icons";

import {radius, useAppTheme} from "@/src/shared/theme";

import SelectSheet, {SelectOption, SelectSheetRef,} from "@/src/shared/ui/form/SelectSheet";

export type SeasonSelectProps = {
  options: SelectOption[];
  selectedValue?: string | null;
  onSelect: (opt: SelectOption) => void;

  /** UI */
  title?: string;
  placeholderLabel?: string;
  testIDButton?: string;
  style?: StyleProp<ViewStyle>;
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
                                                     disabled = false,
                                                     clearable = true,
                                                   }) => {
  const theme = useAppTheme();
  const sheetRef = useRef<SelectSheetRef>(null);

  const isDisabled = disabled || options.length === 0;

  const label = useMemo(() => {
    if (selectedValue) return selectedValue;

    return placeholderLabel;
  }, [placeholderLabel, selectedValue]);

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
            opacity: isDisabled ? 0.6 : 1,
          },
          style,
        ]}
        testID={testIDButton}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{disabled: isDisabled, expanded: false}}
      >
        <MaterialCommunityIcons
          name="calendar-month-outline"
          size={16}
          color={theme.textInactive}
        />

        <Text
          style={[styles.seasonText, {color: theme.text}]}
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
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 6,
  },
  seasonText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
