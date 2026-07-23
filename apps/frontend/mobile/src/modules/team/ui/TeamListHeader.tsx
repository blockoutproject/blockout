import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import {layout, useAppTheme} from "@/src/shared/theme";

import { useBackOrClose } from "@/src/shared/hooks/useBackOrClose";

export type TeamListHeaderProps = {
  title: string;
  onOpenReport: () => void;
  rightAddon?: React.ReactNode;
};

const TeamListHeader: React.FC<TeamListHeaderProps> = ({
  title,
  onOpenReport,
  rightAddon,
}) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { handleBack, canGoBack } = useBackOrClose();

  return (
    <View style={{ paddingTop: insets.top }}>
      <View style={styles.header}>
        <View style={styles.leftGroup}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Ionicons
              name={canGoBack ? "chevron-back-outline" : "close"}
              size={25}
              color={theme.text}
            />
          </TouchableOpacity>

          <Text
            style={[styles.title, { color: theme.text }]}
            adjustsFontSizeToFit
            numberOfLines={2}
            lineBreakStrategyIOS="push-out"
            textBreakStrategy="highQuality"
          >
            {title}
          </Text>
        </View>

        <View style={styles.rightGroup}>
          {rightAddon}

          <TouchableOpacity
            onPress={onOpenReport}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="flag-outline"
              size={28}
              color={theme.text}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default TeamListHeader;

const styles = StyleSheet.create({
  header: {
    height: layout.header,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    marginRight: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "900",
    flexShrink: 1,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    padding: 4,
  },
});
