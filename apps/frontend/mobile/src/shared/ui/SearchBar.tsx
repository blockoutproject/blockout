import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { useAppTheme } from "@/src/shared/providers/ThemeProvider";
import { SEARCHBAR_HEIGHT } from "@/src/shared/theme/tokens";

export type SearchBarProps = {
  /** Valeur contrôlée. */
  value: string;
  /** Mise à jour du texte. */
  onChangeText: (text: string) => void;
  /** Placeholder. */
  placeholder?: string;
  /** Focus callback. */
  onFocus?: () => void;
  /** Blur callback. */
  onBlur?: () => void;
  /** Utilisation dans un BottomSheet. */
  inSheet?: boolean;
  /** Stable id for the native search input when a concrete feature needs it. */
  testID?: string;
};

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = "Rechercher...",
  onFocus,
  onBlur,
  inSheet = true,
  testID,
}) => {
  const theme = useAppTheme();
  const Input = inSheet ? BottomSheetTextInput : TextInput;

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <MaterialCommunityIcons
        name="magnify"
        size={18}
        color={theme.textInactive}
        style={styles.icon}
      />

      <Input
        value={value}
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        testID={testID}
        placeholderTextColor={theme.textInactive}
        onFocus={onFocus}
        onBlur={onBlur}
        style={[styles.input, { color: theme.text }]}
      />

      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Effacer la recherche"
          onPress={() => onChangeText("")}
          style={({ pressed }) => (pressed ? styles.pressed : undefined)}
        >
          <MaterialCommunityIcons
            name="close-circle"
            size={18}
            color={theme.textInactive}
            style={styles.clearIcon}
          />
        </Pressable>
      ) : null}
    </View>
  );
};

export default SearchBar;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    height: SEARCHBAR_HEIGHT,
    paddingRight: 6,
  },
  icon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
  },
  clearIcon: {
    marginRight: 8,
  },
  pressed: { opacity: 0.7 },
});
