import { SportingEntityCardLoading } from "../entity-card";
import { SportingClubLoading } from "../components/sporting-loading";
import { PageList } from "../../../shared/components/page-list";
import { PageViewport } from "../../../shared/components/navigation-backdrop";
import { SportingSupportAction } from "../components/sporting-actions";
import { SportingCalendar } from "../components/sporting-calendar";
import { SportingPageHeader } from "../components/sporting-page-header";
import { hiddenScrollIndicators } from "../../../shared/native/scroll-indicators";
import { SportingTabs } from "../components/sporting-tabs";
import { ListSeparator } from "../../../shared/components/list-separator";
import { BottomContentSpacer } from "../../../shared/components/bottom-content-inset";
import { ResourceText } from "../components/resource-text";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { PageHeader } from "../../../shared/components/page-header";
import {
  Page,
  PageContent,
  PageScrollView,
  pageContentStyle,
} from "../../../shared/components/page";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { EmptyState, ErrorState } from "../../../shared/components/state-card";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Surface } from "../../../shared/components/surface";
import { hashKey, useQuery } from "@tanstack/react-query";
import { useLayoutEffect, useRef, useState } from "react";
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
export function ClubScreen(props: ClubScreenProps) {
  const queries = useConsultationQueries();
  return (
    <ClubPage key={hashKey(queries.club(props.clubId).queryKey)} {...props} />
  );
}

/**
 * Retains a valid season across common reads; only successful disappearance derives the fallback.
 * The season keys the native scene lifetime while the selected category remains owned here.
 */
function ClubPage({ clubId }: ClubScreenProps) {
  const queries = useConsultationQueries();
  const club = useQuery(queries.club(clubId));
  const [tab, setTab] = useState("info");
  const [selectedSeason, setSelectedSeason] = useState<string>();
  const [choosingSeason, setChoosingSeason] = useState(false);
  const data = club.data;
  const feedback = useActionFeedback();
  const currentScope = useRef("");
  const seasons = data?.seasons ?? [];
  const season =
    seasons.find((item) => item.id === selectedSeason) ?? seasons[0];
  // Reconcile only a successful current representation, so a failed read never discards the choice.
  if (club.isSuccess && selectedSeason !== season?.id) {
    setSelectedSeason(season?.id);
  }
  const teams = useQuery({
    ...queries.clubTeams(clubId, season?.id ?? ""),
    enabled: (query) =>
      !!data && !!season && tab === "teams" && query.state.status !== "error",
    staleTime: Infinity,
  });
  const teamData =
    !isAccessDenied(teams.error) && teams.data?.seasonId === season?.id
      ? teams.data
      : undefined;
  const scope = `${tab}:${season?.id ?? ""}`;
  useLayoutEffect(() => {
    currentScope.current = scope;
  }, [scope]);

  /** Explicit refresh retains each authorized scope; late failure feedback stays with the attempted selection. */
  async function refresh() {
    feedback.clear();
    const attemptedScope = scope;
    if (tab === "teams" && data && season) {
      const result = await teams.refetch({ cancelRefetch: false });
      if (
        currentScope.current === attemptedScope &&
        result.isError &&
        result.data?.items.length &&
        !isAccessDenied(result.error)
      ) {
        feedback.error();
      }
      return;
    }
    const result = await club.refetch({ cancelRefetch: false });
    if (
      currentScope.current === attemptedScope &&
      result.isError &&
      result.data &&
      (tab === "info" || result.data.seasons.length > 0) &&
      !isAccessDenied(result.error)
    ) {
      feedback.error();
    }
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
  const blockingState = !data ? (
    <ReadFeedback query={club} loadingContent={<SportingClubLoading />} />
  ) : undefined;
  return (
    <Page fullBleed>
      {blockingState ? (
        <PageViewport
          header={
            <PageHeader
              title="Club"
              action={
                <SportingSupportAction target={{ type: "club", id: clubId }} />
              }
            />
          }
        >
          <PageScrollView>
            {club.isPending ? (
              <PageContent>{blockingState}</PageContent>
            ) : (
              <ScreenState>{blockingState}</ScreenState>
            )}
          </PageScrollView>
        </PageViewport>
      ) : (
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
            /** Selects the existing information, teams and calendar panels for one retained native tab. */
            function renderTabContent() {
              /** Keeps the populated teams and contact sections in their existing native list. */
              function renderClubList() {
                return (
                  <PageList
                    {...hiddenScrollIndicators}
                    alwaysBounceVertical
                    recycleItems
                    refreshControl={
                      value === "info" ||
                      !data ||
                      (value === "teams" && season) ? (
                        <DataRefreshControl
                          onRefresh={refresh}
                          enabled={tab === value}
                        />
                      ) : undefined
                    }
                    contentContainerStyle={pageContentStyle}
                    ItemSeparatorComponent={ListSeparator}
                    ListFooterComponent={BottomContentSpacer}
                    data={
                      data && value === "teams" ? (teamData?.items ?? []) : []
                    }
                    keyExtractor={(item) => item.team.id}
                    renderItem={({ item }) => (
                      <Surface>
                        <SportingLink
                          key={item.team.id}
                          kind="team"
                          active={tab === value}
                          id={item.team.id}
                          identity={item.team}
                          label={item.team.name}
                        />
                        {item.classification.division && (
                          <ResourceText>
                            {item.classification.division.name}
                          </ResourceText>
                        )}
                      </Surface>
                    )}
                    ListHeaderComponent={
                      <View
                        style={[
                          styles.header,
                          value !== "info" && styles.seasonHeader,
                        ]}
                      >
                        {value !== "info" && seasonControls}
                        {data && value === "info" && (
                          <>
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
                                destination={phoneDestination(
                                  data.contacts.phone,
                                )}
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
                                <ResourceText>
                                  Commune non renseignée
                                </ResourceText>
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
                          </>
                        )}
                      </View>
                    }
                  />
                );
              }

              /** Separates empty teams from absent or failed reads without discarding the season controls. */
              function renderEmptyTeamState() {
                if (teams.isError) {
                  return (
                    <ErrorState
                      onRetry={
                        tab === "teams" ? () => void teams.refetch() : undefined
                      }
                      retrying={teams.isFetching}
                    />
                  );
                }
                if (!teamData) {
                  return (
                    <ReadFeedback
                      query={teams}
                      loadingContent={
                        <SportingEntityCardLoading label="Chargement des équipes du club" />
                      }
                    />
                  );
                }
                return (
                  <EmptyState title="Aucune équipe pour cette saison">
                    <Button
                      label="Actualiser"
                      leadingIcon={RefreshCw}
                      onPress={() => void refresh()}
                      loading={teams.isFetching}
                      disabled={tab !== value}
                    />
                  </EmptyState>
                );
              }

              if (value !== "info" && !season) {
                return (
                  <PageScrollView>
                    <ScreenState>
                      {club.isError ? (
                        <ReadFeedback
                          query={club}
                          loadingContent={<SportingClubLoading />}
                        />
                      ) : (
                        <EmptyState title="Aucune saison disponible">
                          <Button
                            label="Actualiser"
                            leadingIcon={RefreshCw}
                            onPress={() => void refresh()}
                            loading={club.isFetching}
                            disabled={tab !== value}
                          />
                        </EmptyState>
                      )}
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
              if (value === "teams" && season && !teamData?.items.length) {
                return (
                  <PageScrollView>
                    {teams.isLoading ? (
                      <PageContent>
                        {seasonControls}
                        <SportingEntityCardLoading label="Chargement des équipes du club" />
                      </PageContent>
                    ) : (
                      <>
                        <PageContent style={styles.stateControls}>
                          {seasonControls}
                        </PageContent>
                        <ScreenState>{renderEmptyTeamState()}</ScreenState>
                      </>
                    )}
                  </PageScrollView>
                );
              }
              return renderClubList();
            }

            return {
              id: value,
              label,
              content: renderTabContent(),
            };
          })}
        />
      )}
    </Page>
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
