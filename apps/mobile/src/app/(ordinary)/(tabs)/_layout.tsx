import type { ComponentPropsWithRef } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
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
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useInboxQueries } from "../../../features/notifications/api/use-inbox-queries";
import { confirmedUnreadCount } from "../../../features/notifications/state/inbox-expiry";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Expo owns tab selection/history; native flex layout retains the approved two rows for enlarged text. */
export default function TabsLayout() {
  const { session, queries } = useInboxQueries();
  const summary = useQuery({
    ...(queries?.summary ??
      queryOptions({
        queryKey: getSessionQueryKey(session.generation, [
          "notification-summary-unavailable",
        ]),
        enabled: false,
        queryFn: async () => ({ unreadCount: 0 }),
      })),
    enabled: false,
  });
  const count = queries ? confirmedUnreadCount(summary.data) : undefined;
  const { colors, membership } = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const guest = session.status === "guest";
  const columns =
    fontScale >= 1.5 && !guest ? styles.twoColumns : styles.oneRow;
  return (
    <Tabs
      style={[styles.tabs, { backgroundColor: colors.canvas }]}
      options={{ backBehavior: "history" }}
    >
      <TabSlot />
      <TabList
        style={[
          styles.capsule,
          {
            marginBottom: insets.bottom + tokens.spacing.sm,
            marginHorizontal:
              fontScale >= 1.5 ? tokens.spacing.lg : tokens.spacing.sm,
            borderColor: membership.border,
            backgroundColor: colors.raised,
          },
        ]}
      >
        <TabTrigger name="index" href="/" asChild>
          <TabButton
            label="Accueil"
            icon={House}
            hidden={guest}
            style={columns}
          />
        </TabTrigger>
        <TabTrigger name="search" href="/search" asChild>
          <TabButton label="Rechercher" icon={Search} style={columns} />
        </TabTrigger>
        <TabTrigger name="notifications" href="/notifications" asChild>
          <TabButton
            label="Notifications"
            icon={Bell}
            count={count}
            hidden={guest}
            style={columns}
          />
        </TabTrigger>
        <TabTrigger name="profile" href="/profile" asChild>
          <TabButton label="Profil" icon={UserRound} style={columns} />
        </TabTrigger>
      </TabList>
    </Tabs>
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
}

/** Native accessible trigger only; no local selection, manual navigation dispatch or badge counter. */
function TabButton({
  label,
  icon: Icon,
  count,
  hidden = false,
  isFocused,
  style,
  ...props
}: TabButtonProps) {
  const { colors, membership } = useTheme();
  const foreground = isFocused ? membership.content : colors.icon;
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
      style={(state) => [
        styles.button,
        typeof style === "function" ? style(state) : style,
        {
          backgroundColor: isFocused ? membership.fill : "transparent",
          opacity: state.pressed ? tokens.opacity.pressed : 1,
        },
        hidden && styles.hidden,
      ]}
    >
      <View>
        <Icon
          accessible={false}
          color={foreground}
          size={tokens.size.icon.lg}
        />
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
      <Text style={[styles.label, { color: foreground }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabs: { flex: 1 },
  capsule: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "stretch",
    gap: tokens.spacing.xs,
    padding: tokens.spacing.xs,
    marginHorizontal: tokens.spacing.sm,
    marginTop: tokens.spacing.lg,
    borderRadius: tokens.radius.panel,
    borderWidth: tokens.border.thin,
  },
  button: {
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
