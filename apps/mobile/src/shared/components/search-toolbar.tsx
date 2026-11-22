import type { PropsWithChildren } from "react";
import {
  Keyboard,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { tokens } from "@/shared/theme/tokens";
import { FilterButton } from "./filter-button";

/** Pairs a screen's search field with its optional filter action. */
export function SearchToolbar({
  children,
  filter,
  style,
}: Readonly<
  PropsWithChildren<{
    filter?: { active: boolean; onPress: () => void };
    style?: StyleProp<ViewStyle>;
  }>
>) {
  return (
    <View style={[styles.toolbar, style]}>
      <View style={styles.search}>{children}</View>
      {filter && (
        <FilterButton
          active={filter.active}
          onPress={() => {
            Keyboard.dismiss();
            filter.onPress();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.screen,
  },
  search: { flex: 1, minWidth: 0 },
});
