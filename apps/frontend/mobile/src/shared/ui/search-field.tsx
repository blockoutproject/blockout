import React, { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";

import {
  borderWidth,
  layout,
  radius,
  spacing,
  touchTarget,
  typography,
  useAppTheme,
} from "@/src/shared/theme";

export type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  inSheet?: boolean;
  testID?: string;
};

/**
 * Renders the canonical native search field while leaving filtering and debounce feature-owned.
 */
export function SearchField({
  value,
  onChangeText,
  placeholder = "Rechercher...",
  onFocus,
  onBlur,
  inSheet = true,
  testID,
}: SearchFieldProps) {
  const theme = useAppTheme();
  const [focused, setFocused] = useState(false);
  const Input = inSheet ? BottomSheetTextInput : TextInput;

  const handleFocus = () => {
    setFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setFocused(false);
    onBlur?.();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: focused ? theme.surface : theme.surfaceSecondary,
          borderColor: focused ? theme.primary : theme.border,
          borderWidth: focused ? borderWidth.medium : borderWidth.thin,
          paddingRight: value ? spacing[4] : spacing[2],
        },
      ]}
    >
      <MaterialCommunityIcons
        name="magnify"
        size={18}
        color={theme.textInactive}
      />

      <Input
        value={value}
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        testID={testID}
        placeholderTextColor={theme.textInactive}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[styles.input, { color: theme.text }]}
      />

      {value ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Effacer la recherche"
          hitSlop={(touchTarget.minimum - 18) / 2}
          onPress={() => onChangeText("")}
          style={({ pressed }) => (pressed ? styles.pressed : undefined)}
        >
          <MaterialCommunityIcons
            name="close-circle"
            size={18}
            color={theme.textInactive}
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    height: layout.search,
    paddingLeft: spacing[3],
    borderRadius: radius.full,
    borderCurve: "continuous",
  },
  input: {
    ...typography.body,
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
  },
  pressed: {
    opacity: 0.7,
  },
});
