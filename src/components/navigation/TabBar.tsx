import React, { useEffect, useMemo, useRef } from "react";
import {
    Platform,
    Pressable,
    StyleSheet,
    View,
    LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    Easing,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { BOTTOM_TABBAR_HEIGHT } from "@/src/theme/globals";
import { withAlpha } from "@/src/utils/utils";


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
    /** marge supplémentaire au-dessus du bas de la safe area */
    extraBottomInset?: number;

    /** Options de la pill active */
    pillWidth?: number; 
    pillHeight?: number;
    pillOpacity?: number;
    pillBorder?: boolean;
};

const SPRING = { damping: 25, stiffness: 340, mass: 0.8 };

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

    // Mesures des items pour positionner la pill
    const layoutsRef = useRef<Record<number, { x: number; width: number }>>({});
    const pillX = useSharedValue(0);
    const activeIndex = useSharedValue(state.index);

    const animateToIndex = (idx: number) => {
        const layout = layoutsRef.current[idx];
        if (!layout) return;
        const left = layout.x + (layout.width - pillWidth) / 2;
        pillX.value = withSpring(left, SPRING);
        activeIndex.value = idx;
    };

    useEffect(() => {
        const id = setTimeout(() => animateToIndex(state.index), 0);
        return () => clearTimeout(id);
    }, [state.index, descriptors]);

    const offsetFromBottom = useMemo(
        () => Math.max(insets.bottom, 0) + extraBottomInset,
        [insets.bottom, extraBottomInset]
    );

    const pillStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: pillX.value },
            { scale: withSpring(1, { ...SPRING, damping: 15, stiffness: 320 }) },
        ],
    }));

    const Background =
        Platform.OS === "ios" ? (
            <BlurView intensity={70} tint={blurTintIOS} style={StyleSheet.absoluteFill} />
        ) : (
            <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, { backgroundColor: backgroundColorAndroid }]}
            />
        );

    const pillBg = withAlpha(activeColor, pillOpacity);

    return (
        <View pointerEvents="box-none" style={[styles.wrapper, { bottom: offsetFromBottom }]}>
            <View style={[styles.box, { borderColor: theme.border }]}>
                {Background}

                <View
                    style={styles.row}
                    onLayout={() => requestAnimationFrame(() => animateToIndex(state.index))}
                >
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
                                borderColor: pillBorder ? theme.borderSecondary : "transparent",
                            },
                        ]}
                    />

                    {state.routes.map((route, index) => {
                        const { options } = descriptors[route.key];
                        const isFocused = state.index === index;

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
                            navigation.emit({ type: "tabLongPress", target: route.key });
                        };

                        const onLayout = (e: LayoutChangeEvent) => {
                            const { x, width } = e.nativeEvent.layout;
                            layoutsRef.current[index] = { x, width };
                            if (index === state.index)
                                requestAnimationFrame(() => animateToIndex(index));
                        };

                        const iconAnimatedStyle = useAnimatedStyle(() => {
                            const scale = activeIndex.value === index ? 1.06 : 1;
                            return {
                                transform: [
                                    { translateY: withSpring(0, SPRING) },
                                    { scale: withSpring(scale, { ...SPRING, damping: 14 }) },
                                ],
                                opacity: withSpring(activeIndex.value === index ? 1 : 0.9, {
                                    duration: 150,
                                    dampingRatio: 0.8,
                                    stiffness: 200,
                                    // @ts-ignore
                                    easing: Easing.out(Easing.quad),
                                }),
                            };
                        });

                        const color = isFocused ? activeColor : inactiveColor;
                        const size = 26;

                        return (
                            <Pressable
                                key={route.key}
                                onPress={onPress}
                                onLongPress={onLongPress}
                                onLayout={onLayout}
                                style={styles.item}
                                android_ripple={{ color: "rgba(255,255,255,0.05)", borderless: true }}
                                hitSlop={12}
                                accessibilityRole="button"
                                accessibilityState={isFocused ? { selected: true } : {}}
                            >
                                <Animated.View style={[styles.iconWrap, iconAnimatedStyle]}>
                                    {options.tabBarIcon
                                        ? options.tabBarIcon({ focused: isFocused, color, size })
                                        : null}
                                </Animated.View>
                            </Pressable>
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
        borderWidth: StyleSheet.hairlineWidth,
        marginHorizontal: 16,
        borderRadius: 22,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 14,
    },
    row: {
        height: BOTTOM_TABBAR_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-evenly",
        paddingHorizontal: 10,
    },
    item: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        minWidth: 60,
    },
    iconWrap: {
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    pill: {
        position: "absolute",
        left: 0,
    },
});