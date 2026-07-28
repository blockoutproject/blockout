import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { layout, spacing, typography, useAppTheme } from "@/src/shared/theme";

export type ScreenHeaderProps = {
  title?: string;
  leadingAction: React.ReactNode;
  trailingActions?: React.ReactNode;
  testID?: string;
};

/**
 * Shared screen-header anatomy. Feature wrappers keep ownership of navigation,
 * permissions, safe-area handling, and concrete actions.
 */
const ScreenHeader = ({
  title,
  leadingAction,
  trailingActions,
  testID,
}: ScreenHeaderProps) => {
  const theme = useAppTheme();

  return (
    <View style={styles.header} testID={testID}>
      <View style={styles.leadingGroup}>
        {leadingAction}
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: theme.text }]}
          adjustsFontSizeToFit
          lineBreakStrategyIOS="push-out"
          textBreakStrategy="highQuality"
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>

      {trailingActions ? (
        <View style={styles.trailingGroup}>{trailingActions}</View>
      ) : null}
    </View>
  );
};

export default ScreenHeader;

const styles = StyleSheet.create({
  header: {
    height: layout.header,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[1],
    paddingHorizontal: spacing[2],
  },
  leadingGroup: {
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
    flexShrink: 1,
    gap: spacing[1],
  },
  trailingGroup: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing[1],
  },
  title: {
    ...typography.bodyStrong,
    flexShrink: 1,
  },
});
