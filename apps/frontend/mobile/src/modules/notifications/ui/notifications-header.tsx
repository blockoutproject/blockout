import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { layout, spacing, typography, useAppTheme } from "@/src/shared/theme";

const NotificationsHeader = () => {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <View style={{ paddingTop: insets.top }}>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: theme.text }]}
        >
          Notifications
        </Text>
      </View>
    </View>
  );
};

export default NotificationsHeader;

const styles = StyleSheet.create({
  header: {
    height: layout.header,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[3],
  },
  title: {
    fontSize: typography.title.fontSize,
    fontWeight: typography.title.fontWeight,
  },
});
