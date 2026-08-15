import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  iconSize,
  fontWeight,
  typography,
  useAppTheme,
} from "@/src/shared/theme";

type Props = {
  count: number;
};

const FollowersCounter: React.FC<Props> = ({ count }) => {
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name="account-multiple"
        size={iconSize.md}
        color={theme.text}
        style={{ marginRight: 6 }}
      />
      <Text style={[styles.counterText, { color: theme.text }]}>{count}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  counterText: {
    fontWeight: fontWeight.semiBold,
    fontSize: typography.body.fontSize,
  },
});

export default FollowersCounter;
