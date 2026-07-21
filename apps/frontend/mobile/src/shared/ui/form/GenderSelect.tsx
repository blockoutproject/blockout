import React, {useCallback, useMemo, useRef} from "react";
import * as Haptics from "expo-haptics";
import {StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle,} from "react-native";
import {MaterialCommunityIcons} from "@expo/vector-icons";

import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {CORNERS} from "@/src/shared/theme/tokens";
import SelectSheet, {SelectOption, SelectSheetRef,} from "@/src/shared/ui/form/SelectSheet";
import {EnumGender, GenderLabels} from "@/src/types/enums/Gender";

export type GenderSelectProps = {
  selectedValue?: EnumGender | null;
  onSelect: (opt: SelectOption) => void;

  /** UI */
  title?: string;
  placeholderLabel?: string;
  testIDButton?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  clearable?: boolean;
};

const GenderSelect: React.FC<GenderSelectProps> = ({
                                                     selectedValue,
                                                     onSelect,
                                                     title = "Choisir un genre",
                                                     placeholderLabel = "Genre",
                                                     testIDButton,
                                                     style,
                                                     disabled = false,
                                                     clearable = true,
                                                   }) => {
  const theme = useAppTheme();
  const sheetRef = useRef<SelectSheetRef>(null);

  const options: SelectOption[] = useMemo(
    () => [
      {value: EnumGender.M, label: GenderLabels[EnumGender.M]},
      {value: EnumGender.F, label: GenderLabels[EnumGender.F]},
      {value: EnumGender.O, label: GenderLabels[EnumGender.O]},
    ],
    [],
  );

  const isDisabled = disabled || options.length === 0;

  const label = useMemo(() => {
    if (selectedValue) {
      const opt = options.find((o) => o.value === selectedValue);
      if (opt) return opt.label;
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
          styles.genderBtn,
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
          name="gender-male-female"
          size={16}
          color={theme.textInactive}
        />

        <Text
          style={[styles.genderText, {color: theme.text}]}
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

export default GenderSelect;

const styles = StyleSheet.create({
  genderBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: CORNERS,
    borderWidth: 1,
    gap: 6,
  },
  genderText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
