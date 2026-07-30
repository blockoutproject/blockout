import React from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { iconSize, layout, useAppTheme, withAlpha } from "@/src/shared/theme";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import MaskedImage from "@/src/shared/ui/images/masked-image";
import { IconAction } from "@/src/shared/ui/icon-action";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";
import MatchHeaderBackground from "@/src/modules/match/ui/match-header-background";
import MatchHeaderCenter from "@/src/modules/match/ui/match-header-center";
import {
  getFfvbCalendarUrl,
  type MatchHeaderContent,
} from "@/src/modules/match/view-models/match-header-presentation";

/** Header content rendered over the scroll view. */
export type HeaderContent = MatchHeaderContent;

/** Props for the match header. */
export type MatchHeaderProps = {
  /** Callback to open the report modal. */
  onOpenReport: () => void;
  /** Scroll animated value. */
  scrollY: Animated.Value;
  /** Optional header content. */
  headerContent: HeaderContent;
  /** Gradient colors for the header widgets. */
  headerGradient?: readonly [string, string, ...string[]];
};

const MatchHeader: React.FC<MatchHeaderProps> = ({
  onOpenReport,
  scrollY,
  headerContent,
  headerGradient,
}) => {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const BG_FADE_IN_START = 8;
  const BG_FADE_IN_END = 48;
  const APPEAR_START = 72;
  const APPEAR_END = 140;

  const handleOpenFfvbCalendar = async () => {
    try {
      const url = getFfvbCalendarUrl(headerContent);
      if (!url) {
        return;
      }

      await Haptics.selectionAsync();
      await WebBrowser.openBrowserAsync(url, {
        enableBarCollapsing: true,
        showTitle: true,
      });
    } catch {}
  };

  const bgOpacity = scrollY.interpolate({
    inputRange: [0, BG_FADE_IN_START, BG_FADE_IN_END],
    outputRange: [0, 0.5, 1],
    extrapolate: "clamp",
  });

  const contentOpacity = scrollY.interpolate({
    inputRange: [APPEAR_START, APPEAR_END],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const leftTranslateX = scrollY.interpolate({
    inputRange: [APPEAR_START, APPEAR_END],
    outputRange: [-12, 0],
    extrapolate: "clamp",
  });

  const rightTranslateX = scrollY.interpolate({
    inputRange: [APPEAR_START, APPEAR_END],
    outputRange: [12, 0],
    extrapolate: "clamp",
  });

  const centerScale = scrollY.interpolate({
    inputRange: [APPEAR_START, APPEAR_END],
    outputRange: [0.92, 1],
    extrapolate: "clamp",
  });

  const containerElevation = scrollY.interpolate({
    inputRange: [BG_FADE_IN_START, BG_FADE_IN_END],
    outputRange: [0, 4],
    extrapolate: "clamp",
  });

  const androidTint = withAlpha(theme.background, 0.88);

  const CenterContent =
    headerContent && headerGradient ? (
      <MatchHeaderCenter
        centerScale={centerScale}
        content={headerContent}
        contentOpacity={contentOpacity}
        gradient={headerGradient}
        leftTranslateX={leftTranslateX}
        rightTranslateX={rightTranslateX}
        theme={theme}
      />
    ) : null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          zIndex: 1,
        },
        Platform.OS === "android"
          ? {
              elevation: containerElevation,
            }
          : null,
      ]}
      collapsable={false}
      testID="match-header"
    >
      <MatchHeaderBackground
        androidTint={androidTint}
        backgroundColor={theme.background}
        opacity={bgOpacity}
      />

      <View
        style={[
          styles.header,
          {
            zIndex: 2,
          },
        ]}
      >
        <IconAction
          accessibilityLabel="Revenir en arrière"
          onPress={router.back}
          testID="match-back-action"
        >
          <Ionicons
            name="chevron-back-outline"
            size={iconSize.navigation}
            color={theme.text}
          />
        </IconAction>
        <View style={styles.rightGroup}>
          <MaskedImage
            fallback={require("@/assets/images/ffvb-logo.png")}
            size={28}
            radius={6}
            onPress={handleOpenFfvbCalendar}
            accessibilityLabel="Ouvrir le calendrier FFVB"
            testID="match-calendar-action"
            shadow
          />
          <IconAction
            accessibilityLabel="Signaler un problème"
            onPress={onOpenReport}
            testID="match-report-action"
          >
            <MaterialCommunityIcons
              name="flag-outline"
              size={iconSize.navigation}
              color={theme.text}
            />
          </IconAction>
        </View>
        {CenterContent}
      </View>
    </Animated.View>
  );
};

export default MatchHeader;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  rightGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  header: {
    height: layout.header,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
  },
});
