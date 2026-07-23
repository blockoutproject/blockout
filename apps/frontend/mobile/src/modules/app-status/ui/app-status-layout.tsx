import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  layout,
  spacing,
  typography,
  useAppTheme,
} from "@/src/shared/theme";

export type AppStatusLayoutProps = React.PropsWithChildren<{
  title: string;
  footer: string;
  testID: string;
}>;

/** Provides the safe-area-aware shell shared by application gate screens. */
export function AppStatusLayout({
  title,
  footer,
  testID,
  children,
}: AppStatusLayoutProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom + spacing[6],
          backgroundColor: theme.background,
        },
      ]}
      testID={testID}
    >
      <View style={styles.header}>
        <Text
          style={[styles.title, { color: theme.text }]}
          accessibilityRole="header"
        >
          {title}
        </Text>
      </View>

      <View style={styles.content}>{children}</View>

      <Text style={[styles.footer, { color: theme.textInactive }]}>
        {footer}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  header: {
    height: layout.header,
    paddingHorizontal: spacing[3],
    justifyContent: "center",
  },
  title: typography.title,
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    ...typography.metadata,
    textAlign: "center",
    marginTop: spacing[2],
  },
});
