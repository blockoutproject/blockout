import { SportingEntityCard, SportingEntityCardLoading } from "../entity-card";
import { useSportingNavigation } from "../navigation";
import { SportingClubLoading } from "../components/sporting-loading";
import { ClubLocation } from "../components/club-location";
import { PageList, useLegendListReveal } from "@/shared/components/page-list";
import type { ClubTeamsResponse } from "../../../../.generated/schemas/index.zod";
import {
  sportingIdentityHeaderMinHeight,
  SportingInitialComposition,
} from "../components/sporting-initial-composition";
import { SportingSupportAction } from "../components/sporting-actions";
import { SportingCalendar } from "../components/sporting-calendar";
import { SportingPageHeader } from "../components/sporting-page-header";
import { PagedTabs } from "@/shared/components/paged-tabs";
import {
  useContentReveal,
  useContentRevealStyle,
  useSectionContentReveal,
} from "@/shared/components/content-reveal";
import { ListSeparator } from "@/shared/components/list-separator";
import { BottomContentSpacer } from "@/shared/components/bottom-content-inset";
import { hasReadError, ReadFeedback } from "@/shared/components/read-feedback";
import { ScreenState } from "@/shared/components/screen-state";
import { PageHeader } from "@/shared/components/page-header";
import {
  PageContent,
  PageScrollView,
  pageContentStyle,
} from "@/shared/components/page";
import { isAccessDenied } from "@/shared/api/access-denied";
import { EmptyState } from "@/shared/components/state-card";
import { Surface } from "@/shared/components/surface";
import { hashKey, useQuery } from "@tanstack/react-query";
import { useIsFocused } from "expo-router";
import { useRef, useState, type ReactNode } from "react";
import type { LegendListRef } from "@legendapp/list/react-native";
import { Globe, Mail, Phone, RefreshCw } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { tokens } from "@/shared/theme/tokens";
import { useTheme } from "@/shared/theme/theme-provider";
import { DataRefreshControl } from "@/shared/components/data-refresh-control";
import { Button } from "@/shared/components/button";
import {
  EntryGroup,
  EntryGroupSeparator,
} from "@/shared/components/entry-group";
import { SeasonSelector } from "@/shared/components/season-selector";
import { SelectionRow } from "@/shared/components/selection-row";
import { useConsultationQueries } from "../api/use-consultation-queries";

import { SportingIdentity } from "../components/sporting-identity";
import {
  ContactLink,
  phoneDestination,
  safeWebsite,
} from "../components/contact-link";

/** Exact club identity; the page composes the single native calendar owner. */
export interface ClubScreenProps {
  clubId: string;
}

/** Opens public club information without waiting for an account or entitlement. */
export function ClubScreen(props: Readonly<ClubScreenProps>) {
  const queries = useConsultationQueries();
  return (
    <ClubPage key={hashKey(queries.club(props.clubId).queryKey)} {...props} />
  );
}

/**
 * Retains a valid season across common reads; only successful disappearance derives the fallback.
 * The season keys the native scene lifetime while the selected category remains owned here.
 */
function ClubPage({ clubId }: Readonly<ClubScreenProps>) {
  const queries = useConsultationQueries();
  const { colors } = useTheme();
  const focused = useIsFocused();
  const club = useQuery(queries.club(clubId));
  const [tab, setTab] = useState("info");
  const [selectedSeason, setSelectedSeason] = useState<string>();
  const [choosingSeason, setChoosingSeason] = useState(false);
  const data = club.data;
  const seasons = data?.seasons ?? [];
  const season =
    seasons.find((item) => item.id === selectedSeason) ?? seasons[0];
  // Reconcile only a successful current representation, so a failed read never discards the choice.
  if (club.isSuccess && selectedSeason !== season?.id) {
    setSelectedSeason(season?.id);
  }

  /** The common Club read owns information and the absence of any available season. */
  async function refresh() {
    await club.refetch({ cancelRefetch: false });
  }

  const identity = data ? (
    <SportingIdentity
      identity={data.club}
      kind="club"
      subtitle={[data.contacts.city, data.contacts.postalCode]
        .filter(Boolean)
        .join(" ")}
    />
  ) : undefined;
  const tabs = [
    { id: "info", label: "Infos" },
    { id: "teams", label: "Équipes" },
    { id: "upcoming", label: "À venir" },
    { id: "completed", label: "Terminés" },
  ] as const;
  const seasonControls = season ? (
    <View style={styles.season}>
      <View style={styles.seasonRow}>
        <SeasonSelector
          label={season.label}
          accessibilityLabel="Saison du club"
          expanded={choosingSeason}
          onPress={() => setChoosingSeason(!choosingSeason)}
        />
      </View>
      {choosingSeason && (
        <EntryGroup>
          {seasons.map((item) => (
            <SelectionRow
              key={item.id}
              label={item.label}
              selected={item.id === season.id}
              onPress={() => {
                setSelectedSeason(item.id);
                setChoosingSeason(false);
              }}
            />
          ))}
        </EntryGroup>
      )}
    </View>
  ) : undefined;
  const informationReveal = useSectionContentReveal(
    focused && tab === "info" && !!data && !hasReadError(club),
  );
  const contactsStyle = useContentRevealStyle(
    informationReveal.style,
    "contacts",
  );
  const locationStyle = useContentRevealStyle(
    informationReveal.style,
    "location",
  );
  const information = data ? (
    <PageScrollView
      onLayout={informationReveal.onViewportLayout}
      alwaysBounceVertical
      refreshControl={
        <DataRefreshControl
          onRefresh={refresh}
          enabled={tab === "info"}
          fetching={club.isFetching}
        />
      }
    >
      <PageContent
        style={styles.information}
        onLayout={informationReveal.onContentLayout}
      >
        <Animated.View
          style={[styles.informationSection, contactsStyle]}
          onLayout={(event) =>
            informationReveal.onBlockLayout("contacts", event)
          }
        >
          <Text
            accessibilityRole="header"
            style={[tokens.typography.headingSm, { color: colors.text }]}
          >
            Coordonnées
          </Text>
          <Surface style={styles.contactGroup}>
            <ContactLink
              label="Site web"
              value={data.contacts.website}
              destination={safeWebsite(data.contacts.website)}
              icon={Globe}
            />
            <View style={styles.contactDivider}>
              <EntryGroupSeparator />
            </View>
            <ContactLink
              label="E-mail du club"
              value={data.contacts.email}
              destination={
                data.contacts.email
                  ? `mailto:${encodeURIComponent(data.contacts.email)}`
                  : undefined
              }
              icon={Mail}
            />
            <View style={styles.contactDivider}>
              <EntryGroupSeparator />
            </View>
            <ContactLink
              label="Téléphone"
              value={data.contacts.phone}
              destination={phoneDestination(data.contacts.phone)}
              icon={Phone}
            />
          </Surface>
        </Animated.View>
        <Animated.View
          style={[styles.informationSection, locationStyle]}
          onLayout={(event) =>
            informationReveal.onBlockLayout("location", event)
          }
        >
          <Text
            accessibilityRole="header"
            style={[tokens.typography.headingSm, { color: colors.text }]}
          >
            Localisation
          </Text>
          <ClubLocation detail={data} />
        </Animated.View>
      </PageContent>
    </PageScrollView>
  ) : undefined;

  return (
    <SportingInitialComposition
      detail={club}
      header={
        <PageHeader
          title="Le club"
          action={
            <SportingSupportAction target={{ type: "club", id: clubId }} />
          }
        />
      }
      loading={<SportingClubLoading />}
    >
      {data && (
        <PagedTabs
          key={season?.id}
          selected={tab}
          onSelect={setTab}
          header={
            data && (
              <SportingPageHeader
                action={
                  <SportingSupportAction
                    target={{ type: "club", id: clubId }}
                  />
                }
                identity={data.club}
                kind="club"
              />
            )
          }
          collapsibleHeader={<PageContent>{identity}</PageContent>}
          collapsibleHeaderMinHeight={sportingIdentityHeaderMinHeight}
          tabs={tabs.map(({ id: value, label }) => {
            /** Chooses the retained Info, season-owned Teams or calendar scene without joining their read lifetimes. */
            function renderTabContent() {
              if (value !== "info" && !season) {
                return (
                  <PageScrollView>
                    <ScreenState>
                      <ClubEmptyState
                        title="Aucune saison disponible"
                        onRefresh={refresh}
                        fetching={club.isFetching}
                        active={tab === value}
                      />
                    </ScreenState>
                  </PageScrollView>
                );
              }
              if ((value === "upcoming" || value === "completed") && season) {
                return (
                  <SportingCalendar
                    selection={{ clubId, seasonId: season.id, category: value }}
                    active={tab === value}
                  >
                    {seasonControls}
                  </SportingCalendar>
                );
              }
              if (value === "teams" && season) {
                return (
                  <ClubTeams
                    clubId={clubId}
                    seasonId={season.id}
                    active={tab === value}
                  >
                    {seasonControls}
                  </ClubTeams>
                );
              }
              return information;
            }

            return {
              id: value,
              label,
              content: renderTabContent(),
            };
          })}
        />
      )}
    </SportingInitialComposition>
  );
}

function clubTeamCardKey(item: ClubTeamsResponse["items"][number]) {
  return item.team.id.toLowerCase();
}

/** One exact Club season owns its teams read, scoped feedback and native list position; the parent supplies season controls. */
function ClubTeams({
  clubId,
  seasonId,
  active,
  children,
}: Readonly<{
  clubId: string;
  seasonId: string;
  active: boolean;
  children?: ReactNode;
}>) {
  const queries = useConsultationQueries();
  const sporting = useSportingNavigation(active);
  const teams = useQuery({
    ...queries.clubTeams(clubId, seasonId),
    enabled: (query) => active && query.state.status !== "error",
    staleTime: Infinity,
  });
  const data =
    !isAccessDenied(teams.error) && teams.data?.seasonId === seasonId
      ? teams.data
      : undefined;
  const items = data?.items ?? [];
  const hasItems = items.length > 0;
  const list = useRef<LegendListRef>(null);
  const offset = useRef(0);
  const { start, style: revealStyle } = useContentReveal();
  const listReveal = useLegendListReveal({
    list,
    items,
    keyForItem: clubTeamCardKey,
    start,
    active,
    contentContainerStyle: pageContentStyle,
  });

  /** Explicitly rereads only this season, including a failed observer awaiting its card action. */
  async function refresh() {
    if (active) {
      await teams.refetch({ cancelRefetch: false });
    }
  }

  if (hasReadError(teams)) {
    return (
      <PageScrollView>
        <ScreenState>
          <ReadFeedback query={teams} loadingContent={null} onRetry={refresh} />
        </ScreenState>
      </PageScrollView>
    );
  }
  const emptyContent = data && (
    <ScreenState style={styles.listState}>
      <ClubEmptyState
        title="Aucune équipe pour cette saison"
        onRefresh={refresh}
        fetching={teams.isFetching}
        active={active}
      />
    </ScreenState>
  );
  return (
    <PageList
      ref={list}
      alwaysBounceVertical={hasItems}
      bounces={hasItems}
      recycleItems
      onScroll={({ nativeEvent }) => {
        if (hasItems) {
          offset.current = nativeEvent.contentOffset.y;
        }
      }}
      onLoad={() => {
        if (offset.current > 0) {
          void list.current?.scrollToOffset({
            offset: offset.current,
            animated: false,
          });
        }
      }}
      {...listReveal}
      refreshControl={
        <DataRefreshControl
          onRefresh={refresh}
          enabled={active && hasItems}
          fetching={teams.isFetching}
        />
      }
      contentContainerStyle={pageContentStyle}
      ItemSeparatorComponent={ListSeparator}
      ListFooterComponent={BottomContentSpacer}
      ListEmptyComponent={emptyContent}
      loadingFeedback={{
        active: teams.isLoading,
        content: (
          <SportingEntityCardLoading
            layout="club-team"
            label="Chargement des équipes du club"
          />
        ),
      }}
      data={items}
      keyExtractor={(item) => item.team.id}
      renderItem={({ item }) => (
        <SportingEntityCard
          kind="team"
          layout="club-team"
          identity={item.team}
          classification={item.classification}
          revealStyle={revealStyle}
          onOpen={(kind, id) => void sporting.navigate(kind, id)}
        />
      )}
      ListHeaderComponent={<View style={styles.seasonHeader}>{children}</View>}
    />
  );
}

/** Each retained Empty owns only its explicit Actualiser gesture; Query retains the read and background activity. */
function ClubEmptyState({
  title,
  onRefresh,
  fetching,
  active,
}: Readonly<{
  title: string;
  onRefresh: () => Promise<unknown>;
  fetching: boolean;
  active: boolean;
}>) {
  const [refreshing, setRefreshing] = useState(false);

  /** The initiating scene retains this action's intent until its existing read settles. */
  async function refresh() {
    if (!active || refreshing) {
      return;
    }
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <EmptyState title={title}>
      <Button
        label="Actualiser"
        leadingIcon={RefreshCw}
        onPress={() => void refresh()}
        loading={refreshing && fetching}
        disabled={!active}
      />
    </EmptyState>
  );
}

const styles = StyleSheet.create({
  information: {
    paddingTop: tokens.layout.content.start + tokens.spacing.md,
    gap: tokens.layout.section.gap,
  },
  informationSection: { gap: tokens.spacing.md },
  contactGroup: { padding: 0, gap: 0 },
  contactDivider: { marginHorizontal: tokens.spacing.md },
  listState: { padding: 0 },
  seasonHeader: { gap: tokens.spacing.lg, marginBottom: tokens.spacing.lg },
  season: {
    gap: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
  },
  seasonRow: {
    minHeight: tokens.touch.minimum,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: tokens.spacing.sm,
  },
});
