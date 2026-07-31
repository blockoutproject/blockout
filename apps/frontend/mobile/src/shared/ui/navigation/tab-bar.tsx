import React, { useCallback, useEffect, useRef } from "react";
import {
  type LayoutChangeEvent,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, {
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";

import { useSessionState } from "@/src/modules/session/providers/session-context";
import { usePurchases } from "@/src/modules/subscription/providers/purchases-provider";
import {
  borderWidth,
  colors,
  elevation,
  layout,
  radius,
  spacing,
  useAppTheme,
  withAlpha,
} from "@/src/shared/theme";
import { TabBarItem } from "@/src/shared/ui/navigation/tab-bar-item";
import { isTabRouteVisible } from "@/src/modules/session/navigation/tab-route-access";

const SPRING = { damping: 25, stiffness: 340, mass: 0.8 };
const ACTIVE_PILL_WIDTH = 50;
const ACTIVE_PILL_HEIGHT = 44;

type LayoutMap = Record<number, { x: number; width: number }>;

/** Renders the canonical destination bar while preserving Expo Router navigation. */
export default function TabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { isAuthenticated, isMaintenance } = useSessionState();
  const { isPro } = usePurchases();
  const focusedRouteKey = state.routes[state.index]?.key;
  const visibleRoutes = state.routes.filter((route) =>
    isTabRouteVisible({ isAuthenticated, routeName: route.name }),
  );
  const focusedVisibleIndex = visibleRoutes.findIndex(
    (route) => route.key === focusedRouteKey,
  );
  const currentVisibleIndex = Math.max(0, focusedVisibleIndex);
  const layoutsRef = useRef<LayoutMap>({});
  const pillX = useSharedValue(0);
  const activeIndex: SharedValue<number> = useSharedValue(currentVisibleIndex);

  const computePillX = useCallback((index: number) => {
    const itemLayout = layoutsRef.current[index];
    if (!itemLayout) {
      return null;
    }
    return itemLayout.x + (itemLayout.width - ACTIVE_PILL_WIDTH) / 2;
  }, []);

  const animateToIndex = useCallback(
    (index: number) => {
      const x = computePillX(index);
      if (x === null) {
        return;
      }
      pillX.value = withSpring(x, SPRING);
      activeIndex.value = index;
    },
    [activeIndex, computePillX, pillX],
  );

  useEffect(() => {
    requestAnimationFrame(() => animateToIndex(currentVisibleIndex));
  }, [animateToIndex, currentVisibleIndex, visibleRoutes.length]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
  }));

  const borderColor = isMaintenance
    ? theme.error
    : isPro
      ? theme.gold
      : theme.border;
  const navigationBorderWidth =
    isMaintenance || isPro ? borderWidth.medium : borderWidth.thin;
  const activeColor = isMaintenance ? theme.error : theme.text;

  const handleItemLayout =
    (index: number) =>
    (event: LayoutChangeEvent): void => {
      const { x, width } = event.nativeEvent.layout;
      layoutsRef.current[index] = { x, width };

      if (index === currentVisibleIndex) {
        requestAnimationFrame(() => animateToIndex(index));
      }
    };

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrapper, { bottom: insets.bottom }]}
    >
      <View
        style={[
          styles.navigation,
          {
            borderColor,
            borderWidth: navigationBorderWidth,
          },
        ]}
      >
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={90}
            tint="dark"
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: withAlpha(theme.background, 0.92) },
            ]}
          />
        )}

        <View
          style={styles.row}
          onLayout={() => {
            requestAnimationFrame(() => animateToIndex(currentVisibleIndex));
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={[styles.activePill, pillStyle]}
          />

          {visibleRoutes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = route.key === focusedRouteKey;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }

              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                () => undefined,
              );
              animateToIndex(index);
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            return (
              <TabBarItem
                key={route.key}
                options={options}
                index={index}
                isFocused={isFocused}
                color={isFocused ? activeColor : theme.textInactive}
                size={26}
                activeIndex={activeIndex}
                onPress={onPress}
                onLongPress={onLongPress}
                onLayout={handleItemLayout(index)}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: spacing[4],
  },
  navigation: {
    ...elevation.navigation,
    width: "100%",
    maxWidth: 361,
    height: layout.bottomNavigation,
    alignSelf: "center",
    borderRadius: radius.full,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  row: {
    height: layout.bottomNavigation,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[3],
    paddingVertical: 10,
  },
  activePill: {
    position: "absolute",
    left: spacing[3],
    width: ACTIVE_PILL_WIDTH,
    height: ACTIVE_PILL_HEIGHT,
    borderRadius: radius.full,
    borderCurve: "continuous",
    borderWidth: borderWidth.thin,
    borderColor: colors.border.strong,
    backgroundColor: colors.surface.selected,
  },
});
