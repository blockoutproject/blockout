import { homeHref } from "@/shared/native/home-href";
import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type RefObject,
} from "react";
import { BlurTargetView, BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import {
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutRectangle,
  type ViewInstance,
} from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated";
import {
  Tabs,
  TabList,
  TabSlot,
  TabTrigger,
  type TabTriggerSlotProps,
} from "expo-router/ui";
import {
  Bell,
  House,
  Search,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAccountSession } from "@/features/accounts/current-account";
import { useTheme } from "@/shared/theme/theme-provider";
import { tokens } from "@/shared/theme/tokens";
import { useReducedMotion } from "@/shared/theme/use-reduced-motion";
import { SelectionIndicator } from "@/shared/components/selection-indicator";
import { NavigationAccentContext } from "@/shared/components/navigation-accent";
import type { TabSelection } from "@/shared/components/tabs";
import { BottomContentInsetContext } from "@/shared/components/bottom-content-inset";
import { ProOffer } from "@/features/pro";

/** Native presentations cover the retained capsule; its measured clearance keeps the presenting page stable. */
export default function TabsLayout() {
  const session = useAccountSession();
  const { colors, membership } = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const [selectionLayout, setSelectionLayout] = useState<LayoutRectangle>();
  const [accent, setAccent] = useState<TabSelection>();
  const selection = accent ?? membership;
  const [navigationHeight, setNavigationHeight] = useState(0);
  const target = useRef<ViewInstance>(null);
  const guest = session.status === "guest";
  const columns =
    fontScale >= 1.5 && !guest ? styles.twoColumns : styles.oneRow;
  return (
    <BottomContentInsetContext
      value={
        navigationHeight > 0
          ? navigationHeight + insets.bottom + tokens.spacing.sm
          : 0
      }
    >
      <Tabs
        style={[styles.tabs, { backgroundColor: colors.canvas }]}
        options={{ backBehavior: "history" }}
      >
        <BlurTargetView ref={target} style={styles.tabs}>
          <NavigationAccentContext value={setAccent}>
            <TabSlot />
          </NavigationAccentContext>
        </BlurTargetView>
        <TabList asChild>
          <NavigationCapsule
            target={target}
            onLayout={({ nativeEvent }) => {
              if (nativeEvent.layout.height > 0) {
                setNavigationHeight(nativeEvent.layout.height);
              }
            }}
            layout={selectionLayout}
            selectedFill={selection.fill}
            reducedMotion={reducedMotion}
            style={{
              marginBottom: insets.bottom + tokens.spacing.sm,
              marginHorizontal:
                fontScale >= 1.5 ? tokens.spacing.lg : tokens.spacing.sm,
            }}
          >
            <TabTrigger name="index" href={homeHref} asChild>
              <TabButton
                label="Accueil"
                selectedColor={selection.content}
                icon={House}
                hidden={guest}
                style={columns}
                reducedMotion={reducedMotion}
                onFocusedLayout={setSelectionLayout}
              />
            </TabTrigger>
            <TabTrigger name="search" href="/search" asChild>
              <TabButton
                label="Rechercher"
                selectedColor={selection.content}
                icon={Search}
                style={columns}
                reducedMotion={reducedMotion}
                onFocusedLayout={setSelectionLayout}
              />
            </TabTrigger>
            <TabTrigger name="notifications" href="/notifications" asChild>
              <TabButton
                label="Notifications"
                selectedColor={selection.content}
                icon={Bell}
                hidden={guest}
                style={columns}
                reducedMotion={reducedMotion}
                onFocusedLayout={setSelectionLayout}
              />
            </TabTrigger>
            <TabTrigger name="profile" href="/profile" asChild>
              <TabButton
                label="Profil"
                selectedColor={selection.content}
                icon={UserRound}
                style={columns}
                reducedMotion={reducedMotion}
                onFocusedLayout={setSelectionLayout}
              />
            </TabTrigger>
          </NavigationCapsule>
        </TabList>
      </Tabs>
    </BottomContentInsetContext>
  );
}

/** TabList's public slot retains direct trigger discovery while the full floating group owns measurement. */
interface NavigationCapsuleProps extends ComponentPropsWithRef<typeof View> {
  target: RefObject<ViewInstance | null>;
  layout?: LayoutRectangle;
  selectedFill: string;
  reducedMotion: boolean;
}

/** Keeps the eligible Pro offer above the capsule inside one visibility, measurement and safe-area owner. */
function NavigationCapsule({
  children,
  layout,
  reducedMotion,
  selectedFill,
  target,
  style,
  ...props
}: Readonly<NavigationCapsuleProps>) {
  const { scheme, colors, membership } = useTheme();
  return (
    <SafeAreaView
      {...props}
      mode="margin"
      edges={{ left: "additive", right: "additive" }}
      style={[style, styles.navigation]}
    >
      <ProOffer />
      <View
        style={[
          styles.capsule,
          { borderColor: membership.border, boxShadow: colors.capsuleShadow },
        ]}
      >
        <BlurView
          pointerEvents="none"
          blurTarget={target}
          blurMethod="dimezisBlurView"
          tint={tokens.blur.navigation.tint[scheme]}
          intensity={tokens.blur.navigation.intensity}
          blurReductionFactor={tokens.blur.navigation.androidReduction}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.row}>
          <SelectionIndicator
            layout={layout}
            reducedMotion={reducedMotion}
            radius={tokens.radius.panelInset}
            fill={selectedFill}
          />
          {children}
        </View>
      </View>
    </SafeAreaView>
  );
}

/** Router supplies the exact root and current focus; hidden personal entries retain their route definitions. */
interface TabButtonProps extends Omit<TabTriggerSlotProps, "ref"> {
  /** React Native 0.88 supplies the host-element ref type for Router's asChild forwarding. */
  ref?: ComponentPropsWithRef<typeof Pressable>["ref"];
  label: string;
  icon: LucideIcon;
  hidden?: boolean;
  selectedColor: string;
  reducedMotion: boolean;
  onFocusedLayout: (layout: LayoutRectangle | undefined) => void;
}

/** Reselecting reaches the exact root even after an unanchored warm link; other presses keep Router's tab switching. */
function TabButton({
  label,
  icon: Icon,
  hidden = false,
  isFocused,
  style,
  onLayout,
  reducedMotion,
  selectedColor,
  onFocusedLayout,
  ...props
}: Readonly<TabButtonProps>) {
  const router = useRouter();
  const { colors } = useTheme();
  const [layout, setLayout] = useState<LayoutRectangle>();
  useEffect(() => {
    if (isFocused) {
      onFocusedLayout(hidden ? undefined : layout);
    }
  }, [isFocused, hidden, layout, onFocusedLayout]);
  const focus = useDerivedValue(() =>
    withTiming(isFocused ? 1 : 0, {
      duration: reducedMotion ? 0 : tokens.motion.navigation.duration,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    }),
  );
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(focus.value, [0, 1], [colors.text, selectedColor]),
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + focus.value * (tokens.motion.navigation.iconScale - 1) },
      { translateY: -focus.value * tokens.motion.navigation.iconLift },
    ],
  }));
  const inactiveStyle = useAnimatedStyle(() => ({ opacity: 1 - focus.value }));
  const activeStyle = useAnimatedStyle(() => ({ opacity: focus.value }));
  return (
    <Pressable
      {...props}
      onPress={(event) => {
        if (isFocused && props.href) {
          router.dismissTo(props.href);
        } else {
          props.onPress?.(event);
        }
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
      onLayout={(event) => {
        onLayout?.(event);
        const next = event.nativeEvent.layout;
        setLayout((current) =>
          current?.x === next.x &&
          current.y === next.y &&
          current.width === next.width &&
          current.height === next.height
            ? current
            : next,
        );
      }}
      style={(state) => [
        typeof style === "function" ? style(state) : style,
        // Router sizing survives; this composition owns vertical icon/label alignment.
        styles.button,
        {
          opacity: state.pressed ? tokens.opacity.pressed : 1,
        },
        hidden && styles.hidden,
      ]}
    >
      <Animated.View style={[styles.icon, iconStyle]}>
        <Animated.View style={inactiveStyle}>
          <Icon
            accessible={false}
            color={colors.icon}
            size={tokens.size.icon.lg}
          />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, activeStyle]}>
          <Icon
            accessible={false}
            color={selectedColor}
            size={tokens.size.icon.lg}
          />
        </Animated.View>
      </Animated.View>
      <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: { flex: 1 },
  navigation: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    flexDirection: "column",
    gap: tokens.spacing.sm,
  },
  capsule: {
    flexDirection: "column",
    padding: tokens.spacing.xs,
    borderRadius: tokens.radius.panel,
    borderWidth: tokens.border.thin,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
    gap: tokens.spacing.xs,
  },
  button: {
    flexDirection: "column",
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.optical,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.xs,
    borderRadius: tokens.radius.lg,
  },
  oneRow: { flexGrow: 1, flexBasis: 0 },
  twoColumns: { flexGrow: 1, flexBasis: "45%" },
  hidden: { display: "none" },
  icon: { width: tokens.size.icon.lg, height: tokens.size.icon.lg },
  label: { ...tokens.typography.navigationLabel, textAlign: "center" },
});
