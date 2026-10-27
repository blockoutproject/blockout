import { Text, useWindowDimensions } from "react-native";
import { Tabs } from "expo-router";
import { Bell, House, Search, UserRound } from "lucide-react-native";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useInboxQueries } from "../../../features/notifications/api/use-inbox-queries";
import { confirmedUnreadCount } from "../../../features/notifications/state/inbox-expiry";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";

/** Expo Router owns tab selection/history; the existing summary owns the notification badge across all pages. */
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
  // The ordinary layout keeps the actual summary observer mounted, including on other tabs.
  const count = queries ? confirmedUnreadCount(summary.data) : undefined;
  const { colors, membership } = useTheme();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const guest = session.status === "guest";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: membership.content,
        tabBarInactiveTintColor: colors.icon,
        tabBarActiveBackgroundColor: membership.fill,
        tabBarAllowFontScaling: true,
        tabBarLabelPosition: "below-icon",
        tabBarLabel: ({ children, color }) => (
          <Text
            style={{
              ...tokens.typography.metadata,
              fontSize: 10,
              lineHeight: 14,
              letterSpacing: 0,
              textAlign: "center",
              color,
            }}
          >
            {children}
          </Text>
        ),
        tabBarItemStyle: { borderRadius: tokens.radius.lg },
        tabBarBadgeStyle: {
          backgroundColor: colors.error,
          color: colors.onDarkAccent,
          ...tokens.typography.metadata,
        },
        tabBarStyle: {
          height: 64 + Math.max(0, fontScale - 1) * 28,
          marginHorizontal: tokens.spacing.sm,
          marginTop: tokens.spacing.lg,
          marginBottom: insets.bottom + tokens.spacing.sm,
          padding: tokens.spacing.xs,
          paddingBottom: tokens.spacing.xs,
          borderRadius: tokens.radius.panel,
          borderWidth: tokens.border.thin,
          borderTopWidth: tokens.border.thin,
          borderColor: membership.border,
          backgroundColor: colors.raised,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          href: guest ? null : undefined,
          tabBarIcon: ({ color, size }) => (
            <House accessible={false} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Rechercher",
          tabBarIcon: ({ color, size }) => (
            <Search accessible={false} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          href: guest ? null : undefined,
          tabBarBadge: count && count > 0 ? count : undefined,
          tabBarAccessibilityLabel:
            count && count > 0
              ? `Notifications, ${count} non lues`
              : "Notifications",
          tabBarIcon: ({ color, size }) => (
            <Bell accessible={false} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => (
            <UserRound accessible={false} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
