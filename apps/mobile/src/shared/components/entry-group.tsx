import {
  Children,
  Fragment,
  isValidElement,
  type PropsWithChildren,
} from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme/theme-provider";
import { tokens } from "../theme/tokens";
import { Surface } from "./surface";

/** Reuses the basic-list divider in grouped content and virtualized lists without owning row behavior. */
export function EntryGroupSeparator() {
  const { colors } = useTheme();
  return (
    <View style={[styles.separator, { backgroundColor: colors.border }]} />
  );
}

/** Groups actual basic-list children with one inset and separators; permissions and row behavior stay with callers. */
export function EntryGroup({ children }: PropsWithChildren) {
  return (
    <Surface style={styles.group}>
      {Children.toArray(children).map((child, index) => (
        <Fragment key={isValidElement(child) ? child.key : undefined}>
          {index > 0 && <EntryGroupSeparator />}
          {child}
        </Fragment>
      ))}
    </Surface>
  );
}

const styles = StyleSheet.create({
  group: { padding: tokens.spacing.md, gap: 0 },
  separator: { height: tokens.border.thin },
});
