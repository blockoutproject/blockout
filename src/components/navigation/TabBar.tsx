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
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
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
    blurTintIOS?: "light" | "default" | "dark" | "extraLight" | "regular" | "prominent";
    extraBottomInset?: number;
    pillWidth?: number;
    pillHeight?: number;
    pillOpacity?: number;
    pillBorder?: boolean;
};

const SPRING = { damping: 25, stiffness: 340, mass: 0.8 };

/** ------- CHILD ITEM (isole les hooks) ------- */
function TabBarItem({
    options,
    isFocused,
    color,
    size,
    onPress,
    onLongPress,
    onLayout,
    vIndex,
    activeIndex,
}: {
    options: any;
    isFocused: boolean;
    color: string;
    size: number;
    onPress: () => void;
    onLongPress: () => void;
    onLayout: (e: LayoutChangeEvent) => void;
    vIndex: number;
    activeIndex: SharedValue<number>;
}) {
    const iconAnimatedStyle = useAnimatedStyle(() => {
        const selected = activeIndex.value === vIndex;
        return {
            transform: [
                { translateY: withSpring(0, SPRING) },
                { scale: withSpring(selected ? 1.06 : 1, { ...SPRING, damping: 14 }) },
            ],
            opacity: withSpring(selected ? 1 : 0.9),
        };
    });

    return (
        <Pressable
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
                {options.tabBarIcon ? options.tabBarIcon({ focused: isFocused, color, size }) : null}
            </Animated.View>
        </Pressable>
    );
}

/** --------------- PARENT BAR --------------- */
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

    /** 1) Filtrer les routes invisibles
     * - expo-router : options.href === null
     * - fallback : options.tabBarButton() === null
     * - fallback : options.tabBarStyle.display === "none"
     */
    const visibleRoutes = useMemo(() => {
        return state.routes.filter((r) => {
            const opts: any = descriptors[r.key]?.options ?? {};
            const hrefHidden = Object.prototype.hasOwnProperty.call(opts, "href") && opts.href === null;

            let buttonHidden = false;
            if (typeof opts.tabBarButton === "function") {
                try {
                    // certains devs retournent explicitement `null` pour masquer un tab
                    const maybeNode = opts.tabBarButton({ children: null, onPress: () => { } } as any);
                    buttonHidden = maybeNode === null;
                } catch {
                    // on ignore toute erreur (des impléms custom peuvent exiger d'autres props)
                    buttonHidden = false;
                }
            }

            const styleHidden =
                opts?.tabBarStyle && typeof opts.tabBarStyle === "object"
                    ? (opts.tabBarStyle as any).display === "none"
                    : false;

            return !(hrefHidden || buttonHidden || styleHidden);
        });
    }, [state.routes, descriptors]);

    /** 2) Index actif parmi les visibles */
    const currentKey = state.routes[state.index]?.key;
    let activeVisibleIndex = visibleRoutes.findIndex((r) => r.key === currentKey);
    const currentIsHidden = activeVisibleIndex === -1;
    if (currentIsHidden) activeVisibleIndex = 0;

    /** 3) Mesures (par index visible) */
    const layoutsRef = useRef<Record<number, { x: number; width: number }>>({});
    const pillX = useSharedValue(0);
    const activeIndex = useSharedValue(activeVisibleIndex);

    const animateToVisibleIndex = (idx: number) => {
        const layout = layoutsRef.current[idx];
        if (!layout) return;
        const left = layout.x + (layout.width - pillWidth) / 2;
        pillX.value = withSpring(left, SPRING);
        activeIndex.value = idx;
    };

    /** 4) Sync animation quand nav/visibilité change */
    useEffect(() => {
        const target = currentIsHidden ? 0 : activeVisibleIndex;
        const id = setTimeout(() => animateToVisibleIndex(target), 0);
        return () => clearTimeout(id);
    }, [state.index, visibleRoutes.length, currentIsHidden, activeVisibleIndex]);

    /** Offsets & styles */
    const offsetFromBottom = Math.max(insets.bottom, 0) + extraBottomInset;

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
                    onLayout={() => requestAnimationFrame(() => animateToVisibleIndex(activeVisibleIndex))}
                >
                    {/* PILL */}
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

                    {/* ITEMS visibles */}
                    {visibleRoutes.map((route, vIndex) => {
                        const { options } = descriptors[route.key];
                        const isFocusedVisible = vIndex === activeVisibleIndex;

                        const onPress = () => {
                            const event = navigation.emit({
                                type: "tabPress",
                                target: route.key,
                                canPreventDefault: true,
                            });
                            if (!isFocusedVisible && !event.defaultPrevented) {
                                navigation.navigate(route.name);
                            }
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            animateToVisibleIndex(vIndex);
                        };

                        const onLongPress = () => {
                            navigation.emit({ type: "tabLongPress", target: route.key });
                        };

                        const onLayout = (e: LayoutChangeEvent) => {
                            const { x, width } = e.nativeEvent.layout;
                            layoutsRef.current[vIndex] = { x, width };
                            if (vIndex === activeVisibleIndex) {
                                requestAnimationFrame(() => animateToVisibleIndex(vIndex));
                            }
                        };

                        const color = isFocusedVisible ? activeColor : inactiveColor;
                        const size = 26;

                        return (
                            <TabBarItem
                                key={route.key}
                                options={options}
                                isFocused={isFocusedVisible}
                                color={color}
                                size={size}
                                onPress={onPress}
                                onLongPress={onLongPress}
                                onLayout={onLayout}
                                vIndex={vIndex}
                                activeIndex={activeIndex}
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