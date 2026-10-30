import { useEffect, useState, type ComponentPropsWithRef } from "react";
import { useSegments } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutRectangle,
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
import { useQuery, skipToken } from "@tanstack/react-query";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { getGetNotificationSummaryQueryKey } from "../../../../.generated/mobile";
import { useInboxQueries } from "../../../features/notifications/api/use-inbox-queries";
import { confirmedUnreadCount } from "../../../features/notifications/state/inbox-expiry";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { useReducedMotion } from "../../../shared/theme/use-reduced-motion";
import { SelectionIndicator } from "../../../shared/components/selection-indicator";
import { BottomContentInsetContext } from "../../../shared/components/bottom-content-inset";

/** Expo owns focus/history; the measured floating capsule retains native two-row layout for enlarged text. */
export default function TabsLayout() {
  const sheetVisible = useSegments().includes("(sheets)");
  const { session, queries } = useInboxQueries();
  const summary = useQuery({
    queryKey: getGetNotificationSummaryQueryKey(
      session.accountId ?? "unavailable",
    ),
    queryFn: queries?.summary.queryFn ?? skipToken,
    enabled: false,
  });
  const count = queries ? confirmedUnreadCount(summary.data) : undefined;
  const { colors, membership } = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const [selectionLayout, setSelectionLayout] = useState<LayoutRectangle>();
  const [capsuleHeight, setCapsuleHeight] = useState(0);
  const guest = session.status === "guest";
  const columns =
    fontScale >= 1.5 && !guest ? styles.twoColumns : styles.oneRow;
  return (
    <BottomContentInsetContext
      value={
        capsuleHeight > 0
          ? capsuleHeight + insets.bottom + tokens.spacing.sm
          : 0
      }
    >
      <Tabs
        style={[styles.tabs, { backgroundColor: colors.canvas }]}
        options={{ backBehavior: "history" }}
      >
        <TabSlot />
        <TabList asChild>
          <NavigationCapsule
            onLayout={({ nativeEvent }) => {
              if (nativeEvent.layout.height > 0)
                setCapsuleHeight(nativeEvent.layout.height);
            }}
            layout={selectionLayout}
            reducedMotion={reducedMotion}
            style={{
              marginBottom: insets.bottom + tokens.spacing.sm,
              marginHorizontal:
                fontScale >= 1.5 ? tokens.spacing.lg : tokens.spacing.sm,
              borderColor: membership.border,
              backgroundColor: colors.raised,
              display: sheetVisible ? "none" : "flex",
            }}
          >
            <TabTrigger name="index" href="/" asChild>
              <TabButton
                label="Accueil"
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
                icon={Search}
                style={columns}
                reducedMotion={reducedMotion}
                onFocusedLayout={setSelectionLayout}
              />
            </TabTrigger>
            <TabTrigger name="notifications" href="/notifications" asChild>
              <TabButton
                label="Notifications"
                icon={Bell}
                count={count}
                hidden={guest}
                style={columns}
                reducedMotion={reducedMotion}
                onFocusedLayout={setSelectionLayout}
              />
            </TabTrigger>
            <TabTrigger name="profile" href="/profile" asChild>
              <TabButton
                label="Profil"
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

/** TabList's public slot retains direct trigger discovery while a borderless inner view owns measurement. */
interface NavigationCapsuleProps extends ComponentPropsWithRef<typeof View> {
  layout?: LayoutRectangle;
  reducedMotion: boolean;
}

/** Insets the capsule through native margins, keeping its decoration inside the horizontal safe area. */
function NavigationCapsule({
  children,
  layout,
  reducedMotion,
  style,
  ...props
}: NavigationCapsuleProps) {
  return (
    <SafeAreaView
      {...props}
      mode="margin"
      edges={{ left: "additive", right: "additive" }}
      style={[style, styles.capsule]}
    >
      <View style={styles.row}>
        <SelectionIndicator
          layout={layout}
          reducedMotion={reducedMotion}
          radius={tokens.radius.panelInset}
        />
        {children}
      </View>
    </SafeAreaView>
  );
}

/** Router-supplied press/focus/ref props remain intact; hidden personal entries retain their route definitions. */
interface TabButtonProps extends Omit<TabTriggerSlotProps, "ref"> {
  /** React Native 0.88 supplies the host-element ref type for Router's asChild forwarding. */
  ref?: ComponentPropsWithRef<typeof Pressable>["ref"];
  label: string;
  icon: LucideIcon;
  count?: number;
  hidden?: boolean;
  reducedMotion: boolean;
  onFocusedLayout: (layout: LayoutRectangle | undefined) => void;
}

/** Router alone selects the trigger; native geometry and one focus animation drive its decoration. */
function TabButton({
  label,
  icon: Icon,
  count,
  hidden = false,
  isFocused,
  style,
  onLayout,
  reducedMotion,
  onFocusedLayout,
  ...props
}: TabButtonProps) {
  const { colors, membership } = useTheme();
  const [layout, setLayout] = useState<LayoutRectangle>();
  useEffect(() => {
    if (isFocused) onFocusedLayout(hidden ? undefined : layout);
  }, [isFocused, hidden, layout, onFocusedLayout]);
  const focus = useDerivedValue(() =>
    withTiming(isFocused ? 1 : 0, {
      duration: reducedMotion ? 0 : tokens.motion.navigation.duration,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    }),
  );
  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      focus.value,
      [0, 1],
      [colors.text, membership.content],
    ),
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
      accessibilityRole="button"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={
        count && count > 0
          ? `${label}, ${count} non ${count === 1 ? "lue" : "lues"}`
          : label
      }
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
      <View>
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
              color={membership.content}
              size={tokens.size.icon.lg}
            />
          </Animated.View>
        </Animated.View>
        {count !== undefined && count > 0 && (
          <View
            accessible={false}
            style={[styles.badge, { backgroundColor: colors.dangerAction }]}
          >
            <Text
              style={[
                tokens.typography.metadata,
                { color: colors.onDangerAction },
              ]}
            >
              {count}
            </Text>
          </View>
        )}
      </View>
      <Animated.Text style={[styles.label, labelStyle]}>{label}</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: { flex: 1 },
  capsule: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    flexDirection: "column",
    padding: tokens.spacing.xs,
    borderRadius: tokens.radius.panel,
    borderWidth: tokens.border.thin,
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
  badge: {
    position: "absolute",
    left: tokens.spacing.md,
    top: -tokens.spacing.sm,
    minWidth: tokens.spacing["2xl"],
    minHeight: tokens.spacing["2xl"],
    paddingHorizontal: tokens.spacing.xs,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: tokens.radius.full,
  },
});
