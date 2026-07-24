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
import { GenderEnum, GenderLabels } from "@/src/shared/model/genderLabels";

export type GenderSelectProps = {
  selectedValue?: GenderEnum | null;
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
      { value: GenderEnum.M, label: GenderLabels[GenderEnum.M] },
      { value: GenderEnum.F, label: GenderLabels[GenderEnum.F] },
      { value: GenderEnum.O, label: GenderLabels[GenderEnum.O] },
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
          style={[styles.genderText, { color: theme.text }]}
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
    borderRadius: radius.full,
    borderWidth: 1,
    gap: 6,
  },
  genderText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
