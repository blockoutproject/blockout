import {
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type ScrollViewInstance,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { UseQueryResult } from "@tanstack/react-query";
import { ApiError } from "../../../shared/api/api-fetch";
import { resourceUnavailable } from "../model/consultation-availability";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { PageHeader } from "../../../shared/components/page-header";
import {
  RequestError,
  RequestLoading,
  AccessDenied,
} from "../../../shared/components/request-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { tokens } from "../../../shared/theme/tokens";
import { useTheme } from "../../../shared/theme/theme-provider";

/** Shared resource chrome; a missing title preserves Figma's empty, balanced header identity slot. */
export interface ResourcePageProps extends PropsWithChildren {
  title?: string;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Blocking feedback replaces content only when no usable representation remains. */
  state?: ReactNode;
}

/** Native safe areas and the source-owned 48 px header; bounded content uses the 16 px section gap. */
export function ResourcePage({
  title,
  children,
  scroll = true,
  refreshing = false,
  onRefresh,
  state,
}: ResourcePageProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.canvas }]}>
      <PageHeader title={title} />
      {scroll || state ? (
        <ScrollView
          alwaysBounceVertical
          contentContainerStyle={state ? styles.stateContent : styles.content}
          refreshControl={
            onRefresh ? (
              <DataRefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            ) : undefined
          }
        >
          {state ? <ScreenState>{state}</ScreenState> : children}
        </ScrollView>
      ) : (
        children
      )}
    </SafeAreaView>
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
  const unavailable = resourceUnavailable(query.error);
  if (
    unavailable &&
    query.error instanceof ApiError &&
    query.error.status !== 404
  )
    return <AccessDenied message="Cette ressource n’est pas accessible." />;
  const message = unavailable
    ? "Cette ressource est introuvable."
    : query.data
      ? "L’actualisation a échoué. Les informations précédentes restent affichées."
      : "Impossible de charger les informations.";
  return (
    <RequestError
      message={message}
      onRetry={unavailable ? undefined : () => void query.refetch()}
      retrying={query.isFetching}
    />
  );
}

/** Exact tab identities and full accessible labels; each visible label fits within the native rail. */
export interface ResourceTabsProps {
  items: readonly { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
}

/** Native tab rail bounds labels to two lines within its measured width and keeps the selected tab reachable. */
export function ResourceTabs({ items, selected, onSelect }: ResourceTabsProps) {
  const { colors, membership } = useTheme();
  const rail = useRef<ScrollViewInstance>(null);
  const [width, setWidth] = useState<number>();
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
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
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
          style={({ pressed }) => [
            styles.tab,
            {
              maxWidth: width,
              opacity: pressed ? tokens.opacity.pressed : 1,
              backgroundColor:
                selected === item.id ? membership.fill : "transparent",
            },
          ]}
        >
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
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
  stateContent: { flexGrow: 1, padding: tokens.spacing.lg },
  content: {
    flexGrow: 1,
    padding: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
    gap: tokens.spacing.lg,
    paddingBottom: tokens.spacing.section,
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
  tabLabel: { ...tokens.typography.label, flexShrink: 1 },
});
