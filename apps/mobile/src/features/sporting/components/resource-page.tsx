import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useEffect, useRef, type PropsWithChildren } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ScrollViewInstance,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { UseQueryResult } from "@tanstack/react-query";
import { resourceUnavailable } from "../model/consultation-availability";
import { IconButton } from "../../../shared/components/icon-button";
import {
  RequestError,
  RequestLoading,
} from "../../../shared/components/request-feedback";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";

/** Shared public-resource chrome; bounded content scrolls under the native safe areas. */
export function ResourcePage({
  title,
  children,
  scroll = true,
}: PropsWithChildren<{ title: string; scroll?: boolean }>) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <View style={styles.header}>
        <IconButton label="Retour" onPress={() => router.back()}>
          <ChevronLeft
            accessible={false}
            color={colors.icon}
            size={tokens.size.actionIcon}
          />
        </IconButton>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          {title}
        </Text>
        <View style={styles.headerRail} />
      </View>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content}>
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
  );
}

/** Flat information grouping shared by the four resource pages. */
export function ResourceCard({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {children}
    </View>
  );
}

/** Readable copy for unavailable/partial facts; missing information never becomes a fabricated value. */
export function ResourceText({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return (
    <Text style={[styles.copy, { color: colors.secondaryText }]}>
      {children}
    </Text>
  );
}

/** Announces pending, failed and refused reads independently of still-usable content. */
export function ResourceFeedback<T>({
  query,
}: {
  query: UseQueryResult<T, Error>;
}) {
  if (query.isPending) return <RequestLoading />;
  if (!query.isError) return null;
  const message = resourceUnavailable(query.error)
    ? "Cette ressource est indisponible."
    : query.data
      ? "L’actualisation a échoué. Les informations précédentes restent affichées."
      : "Impossible de charger les informations.";
  return (
    <RequestError
      message={message}
      onRetry={() => void query.refetch()}
      retrying={query.isFetching}
    />
  );
}

/** Exact tab identities and labels; the rail keeps a selected long label reachable without wrapping. */
export interface ResourceTabsProps {
  items: readonly { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
}

/** Content-driven native tab rail with platform touch targets and explicit selected semantics. */
export function ResourceTabs({ items, selected, onSelect }: ResourceTabsProps) {
  const { colors, membership } = useTheme();
  const rail = useRef<ScrollViewInstance>(null);
  const positions = useRef<Record<string, number>>({});
  useEffect(() => {
    rail.current?.scrollTo({
      x: positions.current[selected] ?? 0,
      animated: false,
    });
  }, [selected]);
  return (
    <ScrollView
      horizontal
      ref={rail}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.tabs}
    >
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="tab"
          accessibilityLabel={item.label}
          accessibilityState={{ selected: selected === item.id }}
          onLayout={(event) => {
            positions.current[item.id] = event.nativeEvent.layout.x;
            if (selected === item.id)
              rail.current?.scrollTo({
                x: event.nativeEvent.layout.x,
                animated: false,
              });
          }}
          onPress={() => onSelect(item.id)}
          style={[
            styles.tab,
            {
              backgroundColor:
                selected === item.id ? membership.fill : "transparent",
            },
          ]}
        >
          <Text
            style={[
              styles.tabLabel,
              {
                color:
                  selected === item.id
                    ? membership.content
                    : colors.secondaryText,
              },
            ]}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: tokens.size.control,
    paddingHorizontal: tokens.spacing.lg,
  },
  title: { ...tokens.typography.navigation, flex: 1, textAlign: "center" },
  headerRail: { width: tokens.size.control },
  content: {
    padding: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
    gap: tokens.spacing.md,
    paddingBottom: tokens.spacing.section,
  },
  card: {
    borderWidth: tokens.borderWidth,
    borderRadius: tokens.radius.sheet,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
    overflow: "hidden",
  },
  copy: { ...tokens.typography.body },
  tabs: { flexDirection: "row", gap: tokens.spacing.md },
  tab: {
    minHeight:
      Platform.OS === "android"
        ? tokens.touchTarget.android
        : tokens.touchTarget.ios,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.control,
    justifyContent: "center",
  },
  tabLabel: { ...tokens.typography.label },
});
