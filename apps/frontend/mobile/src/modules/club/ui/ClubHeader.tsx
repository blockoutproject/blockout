import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/shared/providers/ThemeProvider";
import { HEADER_HEIGHT } from "@/src/shared/theme/tokens";
import { useBackOrClose } from "@/src/shared/hooks/useBackOrClose";

/** Header for club screen with back/close and report. */
export type ClubHeaderProps = {
  /** Screen title. */
  title: string;
  /** Open report modal. */
  onOpenReport: () => void;
};

const ClubHeader: React.FC<ClubHeaderProps> = ({ title, onOpenReport }) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { handleBack, canGoBack } = useBackOrClose();

  return (
    <View
      style={[
        {
          paddingTop: insets.top,
        },
      ]}
      testID="club-header"
    >
      <View style={styles.header}>
        <View style={styles.leftGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={canGoBack ? "Retour" : "Fermer"}
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              pressed ? styles.pressed : undefined,
            ]}
            testID="club-back-action"
          >
            <Ionicons
              name={canGoBack ? "chevron-back-outline" : "close"}
              size={25}
              color={theme.text}
            />
          </Pressable>

          <Text
            accessibilityRole="header"
            style={[
              styles.title,
              {
                color: theme.text,
              },
            ]}
            adjustsFontSizeToFit
            numberOfLines={2}
            lineBreakStrategyIOS="push-out"
            textBreakStrategy="highQuality"
          >
            {title}
          </Text>
        </View>

        <View style={styles.rightGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Signaler un problème"
            onPress={onOpenReport}
            hitSlop={{
              top: 10,
              bottom: 10,
              left: 10,
              right: 10,
            }}
            style={({ pressed }) => [
              styles.iconBtn,
              pressed ? styles.pressed : undefined,
            ]}
            testID="club-report-action"
          >
            <MaterialCommunityIcons
              name="flag-outline"
              size={28}
              color={theme.text}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default ClubHeader;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
  },
  header: {
    height: HEADER_HEIGHT,
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
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  pressed: { opacity: 0.7 },
});
