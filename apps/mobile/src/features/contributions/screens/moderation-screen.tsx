import { Controller, useForm } from "react-hook-form";
import { Link, useNavigation, useRouter } from "expo-router";
import { SlidersHorizontal } from "lucide-react-native";
import { useEffect, useRef } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { BottomContentSpacer } from "../../../shared/components/bottom-content-inset";
import { Button } from "../../../shared/components/button";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { IconButton } from "../../../shared/components/icon-button";
import { Page, pageContentStyle } from "../../../shared/components/page";
import { PageHeader } from "../../../shared/components/page-header";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ScrollChrome } from "../../../shared/components/scroll-chrome";
import { SearchField } from "../../../shared/components/search-field";
import { Surface } from "../../../shared/components/surface";
import { Tabs } from "../../../shared/components/tabs";
import { EmptyState } from "../../../shared/components/state-card";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { useTheme } from "../../../shared/theme/theme-provider";
import { tokens } from "../../../shared/theme/tokens";
import { hiddenScrollIndicators } from "../../../shared/native/scroll-indicators";
import {
  SportingLogo,
  formatSportingSchedule,
} from "../../sporting/match-consultation";
import { useModerationQueue, type ModerationFilters } from "../api/moderation";

/** Native route parameters own the committed search/filter selection across detail navigation. */
export interface ModerationScreenProps {
  filters: ModerationFilters;
}
/** Private native queue distinguishes failed/empty reads and retains literal criteria for continuation. */
export function ModerationScreen({ filters }: ModerationScreenProps) {
  const editing = useModerationQueue(filters);
  const { query } = editing;
  const { colors } = useTheme();
  const router = useRouter();
  const navigation = useNavigation();
  const feedback = useActionFeedback();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const { control, handleSubmit, setValue } = useForm<{ query: string }>({
    defaultValues: { query: filters.query ?? "" },
  });
  const rows = editing.allowed
    ? [
        ...new Map(
          (query.data?.pages ?? [])
            .flatMap((page) => page.items)
            .map((item) => [item.match.id, item]),
        ).values(),
      ]
    : [];
  const current = editing.allowed ? query.data?.pages[0] : undefined;
  /** Refreshes from page zero without replacing committed filters or treating an outage as empty. */
  async function refresh() {
    try {
      await editing.refresh();
    } catch {
      if (mounted.current) feedback.error();
    }
  }
  /** Uses native pagination only while this queue is focused and able to continue. */
  async function more() {
    if (
      !navigation.isFocused() ||
      AppState.currentState !== "active" ||
      !query.hasNextPage ||
      query.isFetching
    )
      return;
    const next = await query.fetchNextPage({ cancelRefetch: false });
    if (next.isFetchNextPageError && mounted.current) feedback.error();
  }
  return (
    <Page edges={["left", "right"]}>
      <ScrollChrome header={<PageHeader title="Liens vidéo" />}>
        {({ onScroll, headerHeight }) => (
          <Animated.FlatList
            {...hiddenScrollIndicators}
            data={rows}
            keyExtractor={(item) => item.match.id}
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={[
              pageContentStyle,
              {
                paddingTop: headerHeight + tokens.layout.content.start,
                gap: tokens.spacing.md,
              },
            ]}
            refreshControl={
              <DataRefreshControl
                refreshing={query.isRefetching}
                onRefresh={() => void refresh()}
              />
            }
            ListHeaderComponent={
              <View style={styles.controls}>
                <View style={styles.search}>
                  <View style={styles.searchInput}>
                    <Controller
                      control={control}
                      name="query"
                      render={({ field }) => (
                        <SearchField
                          label="Rechercher un match, un lien"
                          placeholder="Rechercher un match, un lien…"
                          value={field.value}
                          onChangeText={field.onChange}
                          onBlur={field.onBlur}
                          onClear={() => {
                            setValue("query", "");
                            router.setParams({ query: "" });
                          }}
                          returnKeyType="search"
                          onSubmitEditing={() =>
                            void handleSubmit(({ query }) =>
                              router.setParams({ query }),
                            )()
                          }
                        />
                      )}
                    />
                  </View>
                  <IconButton
                    label="Filtres"
                    onPress={() =>
                      router.push({
                        pathname: "/administration/stream-links/filters",
                        params: { ...filters },
                      })
                    }
                  >
                    <SlidersHorizontal
                      color={colors.icon}
                      size={tokens.size.icon.md}
                    />
                  </IconButton>
                </View>
                <Tabs
                  items={[
                    { id: "to-review", label: "À traiter" },
                    { id: "active", label: "Actifs" },
                    { id: "all", label: "Tous" },
                  ]}
                  selected={filters.state ?? "to-review"}
                  onSelect={(state) => router.setParams({ state })}
                />
              </View>
            }
            ListEmptyComponent={
              !editing.allowed &&
              (editing.profile.isSuccess ||
                editing.session.status === "guest") ? (
                <Text style={[tokens.typography.body, { color: colors.text }]}>
                  La modération des liens vidéo n’est pas autorisée.
                </Text>
              ) : !current ? (
                <ReadFeedback
                  query={
                    editing.profile.isError || editing.profile.isPending
                      ? editing.profile
                      : query
                  }
                />
              ) : (
                <EmptyState
                  title="Aucun lien à traiter"
                  description="Aucun match ne correspond à cette sélection."
                />
              )
            }
            renderItem={({ item }) => {
              const match = item.match;
              const schedule = match.schedule
                ? formatSportingSchedule(match.schedule)
                : undefined;
              const division = match.pool.classification.division;
              return (
                <Link
                  href={{
                    pathname: "/administration/stream-links/[matchId]",
                    params: { matchId: match.id },
                  }}
                  asChild
                >
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`${match.home.name} – ${match.away.name}`}
                  >
                    <Surface>
                      <View style={styles.context}>
                        {division && (
                          <SportingLogo
                            kind="division"
                            identity={division}
                            size={20}
                          />
                        )}
                        <Text
                          style={[
                            tokens.typography.metadata,
                            { color: colors.secondaryText, flex: 1 },
                          ]}
                        >
                          {match.pool.pool.name}
                        </Text>
                        <Text
                          style={[
                            tokens.typography.metadata,
                            { color: colors.secondaryText },
                          ]}
                        >
                          {schedule
                            ? `${schedule.date} ${schedule.time}`
                            : "Date indisponible"}
                        </Text>
                      </View>
                      {[match.home, match.away].map((team) => (
                        <View key={team.id} style={styles.context}>
                          <SportingLogo kind="team" identity={team} size={24} />
                          <Text
                            style={[
                              tokens.typography.strong,
                              { color: colors.text, flex: 1 },
                            ]}
                          >
                            {team.name}
                          </Text>
                        </View>
                      ))}
                      <View
                        style={[styles.badges, { borderColor: colors.border }]}
                      >
                        {[
                          [item.counts.active, "actif"],
                          [item.counts.pending, "en attente"],
                          [item.counts.reports, "signalements"],
                          [item.counts.hidden, "masqué"],
                          [item.counts.rejected, "refusés (historique)"],
                        ]
                          .filter(([count]) => count !== 0)
                          .map(([count, label]) => (
                            <Text
                              key={label}
                              style={[
                                styles.badge,
                                {
                                  color: colors.secondaryText,
                                  backgroundColor: colors.subtle,
                                  borderColor: colors.border,
                                },
                              ]}
                            >
                              {count} {label}
                            </Text>
                          ))}
                      </View>
                    </Surface>
                  </Pressable>
                </Link>
              );
            }}
            ListFooterComponent={
              <View style={styles.controls}>
                {query.hasNextPage && (
                  <Button
                    label="Matchs suivants"
                    variant="secondary"
                    loading={query.isFetchingNextPage}
                    onPress={() => void more()}
                  />
                )}
                <BottomContentSpacer />
              </View>
            }
          />
        )}
      </ScrollChrome>
    </Page>
  );
}

const styles = StyleSheet.create({
  controls: { gap: tokens.spacing.sm },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
  },
  searchInput: { flex: 1 },
  context: {
    flexDirection: "row",
    alignItems: "center",
    gap: tokens.spacing.sm,
    flexWrap: "wrap",
  },
  badges: {
    borderTopWidth: tokens.border.thin,
    paddingTop: tokens.spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: tokens.spacing.sm,
  },
  badge: {
    ...tokens.typography.metadata,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderWidth: tokens.border.thin,
    borderRadius: tokens.radius.sm,
  },
});
