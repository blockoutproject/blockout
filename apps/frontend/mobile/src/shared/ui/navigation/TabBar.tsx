import React, {useCallback, useEffect, useMemo, useRef} from "react";
import {LayoutChangeEvent, Platform, StyleSheet, View} from "react-native";
import {useSafeAreaInsets} from "react-native-safe-area-context";
import type {BottomTabBarProps} from "@react-navigation/bottom-tabs";
import Animated, {SharedValue, useAnimatedStyle, useSharedValue, withSpring,} from "react-native-reanimated";
import {BlurView} from "expo-blur";
import * as Haptics from "expo-haptics";

import {TabBarItem} from "./TabBarItem";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {useSession} from "@/src/shared/providers/SessionProvider";
import {usePurchases} from "@/src/shared/providers/PurchasesProvider";
import {BOTTOM_TABBAR_HEIGHT, CORNERS} from "@/src/shared/theme/globals";
import {withAlpha} from "@/src/utils/utils";

type Props = BottomTabBarProps & {
  activeColor: string;
  inactiveColor: string;
  backgroundColorAndroid?: string;
  blurTintIOS?:
    | "light"
    | "default"
    | "dark"
    | "extraLight"
    | "regular"
    | "prominent";
  extraBottomInset?: number;
  pillWidth?: number;
  pillHeight?: number;
  pillOpacity?: number;
  pillBorder?: boolean;
};

const SPRING = {damping: 25, stiffness: 340, mass: 0.8};

type LayoutMap = Record<number, { x: number; width: number }>;

export default function TabBar({
                                 state,
                                 descriptors,
                                 navigation,
                                 activeColor,
                                 inactiveColor,
                                 backgroundColorAndroid = "rgba(17,17,17,0.92)",
                                 blurTintIOS = "dark",
                                 extraBottomInset = 0,
                                 pillWidth = 50,
                                 pillHeight = 44,
                                 pillOpacity = 0.26,
                                 pillBorder = true,
                               }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const {isMaintenance} = useSession();
  const {isPro} = usePurchases();

  const routes = state.routes;
  const activeRouteIndex = state.index;

  const layoutsRef = useRef<LayoutMap>({});
  const pillX = useSharedValue(0);
  const activeIndex: SharedValue<number> = useSharedValue(activeRouteIndex);

  const offsetFromBottom = Math.max(insets.bottom, 0) + extraBottomInset;

  const computePillX = useCallback(
    (idx: number) => {
      const layout = layoutsRef.current[idx];
      if (!layout) return null;
      return layout.x + (layout.width - pillWidth) / 2;
    },
    [pillWidth],
  );

  const animateToIndex = useCallback(
    (idx: number) => {
      const x = computePillX(idx);
      if (x == null) return;
      pillX.value = withSpring(x, SPRING);
      activeIndex.value = idx;
    },
    [computePillX, pillX, activeIndex],
  );

  useEffect(() => {
    requestAnimationFrame(() => {
      animateToIndex(activeRouteIndex);
    });
  }, [activeRouteIndex, animateToIndex, routes.length]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [
      {translateX: pillX.value},
      {
        scale: withSpring(1, {
          ...SPRING,
          damping: 15,
          stiffness: 320,
        }),
      },
    ],
  }));

  const Background =
    Platform.OS === "ios" ? (
      <BlurView intensity={90} tint={blurTintIOS} style={StyleSheet.absoluteFill}/>
    ) : (
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, {backgroundColor: backgroundColorAndroid}]}
      />
    );

  const accentColor = isMaintenance ? theme.error : activeColor;
  const pillBg = withAlpha(accentColor, pillOpacity);

  const borderColor = isMaintenance ? theme.error : isPro ? theme.gold : theme.border;

  const boxBorderWidth = useMemo(() => {
    if (isMaintenance || isPro) return 2;
    return StyleSheet.hairlineWidth;
  }, [isMaintenance, isPro]);

  const handleRowLayout = () => {
    requestAnimationFrame(() => {
      animateToIndex(activeRouteIndex);
    });
  };

  const handleItemLayout =
    (index: number) =>
      (e: LayoutChangeEvent): void => {
        const {x, width} = e.nativeEvent.layout;
        layoutsRef.current[index] = {x, width};

        if (index === activeRouteIndex) {
          requestAnimationFrame(() => animateToIndex(index));
        }
      };

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, {bottom: offsetFromBottom}]}>
      <View style={[styles.box, {borderColor, borderWidth: boxBorderWidth}]}>
        {Background}

        <View style={styles.row} onLayout={handleRowLayout}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pill,
              pillStyle,
              {
                width: pillWidth,
                height: pillHeight,
                borderRadius: pillHeight / 2,
                backgroundColor: pillBg,
                borderWidth: pillBorder ? StyleSheet.hairlineWidth : 0,
                borderColor: theme.borderSecondary,
              },
            ]}
          />

          {routes.map((route, index) => {
            const {options} = descriptors[route.key];
            const isFocused = index === activeRouteIndex;

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }

              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              animateToIndex(index);
            };

            const onLongPress = () => {
              navigation.emit({
                type: "tabLongPress",
                target: route.key,
              });
            };

            const color = isFocused ? accentColor : inactiveColor;
            const size = 26;

            return (
              <TabBarItem
                key={route.key}
                options={options}
                index={index}
                isFocused={isFocused}
                color={color}
                size={size}
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
  },
  box: {
    marginHorizontal: 16,
    borderRadius: CORNERS,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 14,
  },
  row: {
    height: BOTTOM_TABBAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 10,
  },
  pill: {
    position: "absolute",
    left: 0,
  },
});
