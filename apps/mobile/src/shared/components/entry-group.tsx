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

/** Groups actual basic-list children with one inset and separators; permissions and row behavior stay with callers. */
export function EntryGroup({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return (
    <Surface style={styles.group}>
      {Children.toArray(children).map((child, index) => (
        <Fragment key={isValidElement(child) ? child.key : undefined}>
          {index > 0 && (
            <View
              style={[styles.separator, { backgroundColor: colors.border }]}
            />
          )}
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
