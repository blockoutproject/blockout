import React from "react";
import {StyleSheet, Text, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {HEADER_HEIGHT} from "@/src/shared/theme/globals";

/** Header for notifications screen. */
const NotificationsHeader: React.FC = () => {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <View
      style={[
        {
          paddingTop: insets.top,
        },
      ]}
    >
      <View
        style={styles.header}
      >
        <Text
          style={[
            styles.title,
            {
              color: theme.text,
            },
          ]}
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
    height: HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
  },
});
