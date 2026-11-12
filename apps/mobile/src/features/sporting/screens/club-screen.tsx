import { SportingEntityCardLoading } from "../entity-card";
import { SportingClubLoading } from "../components/sporting-loading";
import { PageList } from "../../../shared/components/page-list";
import { SportingInitialComposition } from "../components/sporting-initial-composition";
import { SportingSupportAction } from "../components/sporting-actions";
import { SportingCalendar } from "../components/sporting-calendar";
import { SportingPageHeader } from "../components/sporting-page-header";
import { hiddenScrollIndicators } from "../../../shared/native/scroll-indicators";
import { SportingTabs } from "../components/sporting-tabs";
import { ListSeparator } from "../../../shared/components/list-separator";
import { BottomContentSpacer } from "../../../shared/components/bottom-content-inset";
import { ResourceText } from "../components/resource-text";
import {
  hasReadError,
  ReadFeedback,
} from "../../../shared/components/read-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { PageHeader } from "../../../shared/components/page-header";
import {
  PageContent,
  PageScrollView,
  pageContentStyle,
} from "../../../shared/components/page";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { EmptyState } from "../../../shared/components/state-card";
import { Surface } from "../../../shared/components/surface";
import { hashKey, useQuery } from "@tanstack/react-query";
import { useRef, useState, type ReactNode } from "react";
import type { LegendListRef } from "@legendapp/list/react-native";
import { Globe, Mail, MapPin, Phone, RefreshCw } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { tokens } from "../../../shared/theme/tokens";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { Button } from "../../../shared/components/button";
import { EntryGroup } from "../../../shared/components/entry-group";
import { SeasonSelector } from "../../../shared/components/season-selector";
import { SelectionRow } from "../../../shared/components/selection-row";
import { useConsultationQueries } from "../api/use-consultation-queries";

import {
  SportingIdentity,
  SportingLink,
} from "../components/sporting-identity";
import {
  ContactLink,
  mapDestination,
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
  const information = data ? (
    <PageList
      {...hiddenScrollIndicators}
      alwaysBounceVertical
      refreshControl={
        <DataRefreshControl
          onRefresh={refresh}
          enabled={tab === "info"}
          fetching={club.isFetching}
        />
      }
      contentContainerStyle={pageContentStyle}
      ListFooterComponent={BottomContentSpacer}
      data={[]}
      renderItem={() => null}
      ListHeaderComponent={
        <View style={styles.header}>
          <Surface>
            <ResourceText>Coordonnées</ResourceText>
            <ContactLink
              label="Site web"
              value={data.contacts.website}
              destination={safeWebsite(data.contacts.website)}
              icon={Globe}
            />
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
            <ContactLink
              label="Téléphone"
              value={data.contacts.phone}
              destination={phoneDestination(data.contacts.phone)}
              icon={Phone}
            />
          </Surface>
          <Surface>
            <ResourceText>Localisation</ResourceText>
            <ResourceText>Commune du club</ResourceText>
            {data.location ? (
              <ContactLink
                label="Ouvrir la commune sur la carte"
                value={data.location.label}
                destination={mapDestination(
                  `${data.location.latitude},${data.location.longitude}`,
                )}
                icon={MapPin}
              />
            ) : (
              <ResourceText>Commune non renseignée</ResourceText>
            )}
            <ResourceText>
              {[
                data.contacts.address,
                data.contacts.postalCode,
                data.contacts.city,
              ]
                .filter(Boolean)
                .join(", ") || "Adresse non renseignée"}
            </ResourceText>
          </Surface>
        </View>
      }
    />
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
        <SportingTabs
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
          identity={<PageContent>{identity}</PageContent>}
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
  const teams = useQuery({
    ...queries.clubTeams(clubId, seasonId),
    enabled: (query) => active && query.state.status !== "error",
    staleTime: Infinity,
  });
  const data =
    !isAccessDenied(teams.error) && teams.data?.seasonId === seasonId
      ? teams.data
      : undefined;
  const list = useRef<LegendListRef>(null);
  const offset = useRef(0);

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
  if (!data?.items.length) {
    return (
      <PageScrollView>
        {teams.isLoading ? (
          <PageContent>
            {children}
            <SportingEntityCardLoading label="Chargement des équipes du club" />
          </PageContent>
        ) : (
          <>
            <PageContent style={styles.stateControls}>{children}</PageContent>
            <ScreenState>
              {data && (
                <ClubEmptyState
                  title="Aucune équipe pour cette saison"
                  onRefresh={refresh}
                  fetching={teams.isFetching}
                  active={active}
                />
              )}
            </ScreenState>
          </>
        )}
      </PageScrollView>
    );
  }
  return (
    <PageList
      ref={list}
      {...hiddenScrollIndicators}
      alwaysBounceVertical
      recycleItems
      onScroll={({ nativeEvent }) => {
        offset.current = nativeEvent.contentOffset.y;
      }}
      onLoad={() => {
        if (offset.current > 0) {
          void list.current?.scrollToOffset({
            offset: offset.current,
            animated: false,
          });
        }
      }}
      refreshControl={
        <DataRefreshControl
          onRefresh={refresh}
          enabled={active}
          fetching={teams.isFetching}
        />
      }
      contentContainerStyle={pageContentStyle}
      ItemSeparatorComponent={ListSeparator}
      ListFooterComponent={BottomContentSpacer}
      data={data.items}
      keyExtractor={(item) => item.team.id}
      renderItem={({ item }) => (
        <Surface>
          <SportingLink
            key={item.team.id}
            kind="team"
            active={active}
            id={item.team.id}
            identity={item.team}
            label={item.team.name}
          />
          {item.classification.division && (
            <ResourceText>{item.classification.division.name}</ResourceText>
          )}
        </Surface>
      )}
      ListHeaderComponent={
        <View style={[styles.header, styles.seasonHeader]}>{children}</View>
      }
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
  stateControls: { paddingBottom: 0 },
  header: { gap: tokens.spacing.lg, marginBottom: tokens.layout.list.gap },
  seasonHeader: { marginBottom: tokens.spacing.lg },
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
