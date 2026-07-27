import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { iconSize, layout, spacing, useAppTheme } from "@/src/shared/theme";

import { useBackOrClose } from "@/src/shared/hooks/use-back-or-close";
import { IconAction } from "@/src/shared/ui/icon-action";

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
          <IconAction
            onPress={handleBack}
            accessibilityLabel={canGoBack ? "Revenir en arrière" : "Fermer"}
          >
            <Ionicons
              name={canGoBack ? "chevron-back-outline" : "close"}
              size={iconSize.lg}
              color={theme.text}
            />
          </IconAction>

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

          <IconAction
            onPress={onOpenReport}
            accessibilityLabel="Signaler un problème"
          >
            <MaterialCommunityIcons
              name="flag-outline"
              size={iconSize.navigation}
              color={theme.text}
            />
          </IconAction>
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
    gap: spacing[1],
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
});
