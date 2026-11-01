import { SportingSupportAction } from "../components/sporting-actions";
import { SportingCalendar } from "../components/sporting-calendar";
import { SportingPageHeader } from "../components/sporting-page-header";
import { LegendList } from "@legendapp/list/react-native";
import { hiddenScrollIndicators } from "../../../shared/native/scroll-indicators";
import { PagedTabs } from "../../../shared/components/paged-tabs";
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
import { EmptyState } from "../../../shared/components/state-card";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Surface } from "../../../shared/components/surface";
import { hashKey, useQuery } from "@tanstack/react-query";
import { useLayoutEffect, useRef, useState } from "react";
import { Globe, Mail, MapPin, Phone } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { tokens } from "../../../shared/theme/tokens";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { Button } from "../../../shared/components/button";
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
  if (club.isSuccess && selectedSeason !== season?.id)
    setSelectedSeason(season?.id);
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
        result.data &&
        !isAccessDenied(result.error)
      )
        feedback.error();
      return;
    }
    const result = await club.refetch({ cancelRefetch: false });
    if (
      currentScope.current === attemptedScope &&
      result.isError &&
      result.data &&
      !isAccessDenied(result.error)
    )
      feedback.error();
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
      <Button
        variant="secondary"
        label={`Saison ${season.label}`}
        onPress={() => setChoosingSeason(!choosingSeason)}
      />
      {choosingSeason &&
        seasons.map((item) => (
          <Button
            key={item.id}
            variant="secondary"
            label={item.label}
            onPress={() => {
              setSelectedSeason(item.id);
              setChoosingSeason(false);
            }}
          />
        ))}
    </View>
  ) : undefined;
  const blockingState = !data ? <ReadFeedback query={club} /> : undefined;
  return (
    <Page>
      {blockingState ? (
        <>
          <PageHeader
            title="Club"
            action={
              <SportingSupportAction target={{ type: "club", id: clubId }} />
            }
          />
          <PageScrollView>
            <ScreenState>{blockingState}</ScreenState>
          </PageScrollView>
        </>
      ) : (
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
          tabs={tabs.map(({ id: value, label }) => ({
            id: value,
            label,
            content:
              value !== "info" && !season ? (
                <PageScrollView
                  refreshControl={
                    <DataRefreshControl
                      refreshing={club.isRefetching}
                      onRefresh={() => void refresh()}
                      enabled={tab === value}
                    />
                  }
                >
                  <PageContent>
                    {identity}
                    {seasonControls}
                  </PageContent>
                  <ScreenState>
                    <EmptyState title="Aucune saison disponible" />
                  </ScreenState>
                </PageScrollView>
              ) : (value === "upcoming" || value === "completed") && season ? (
                <SportingCalendar
                  selection={{ clubId, seasonId: season.id, category: value }}
                  active={tab === value}
                >
                  {identity}
                  {seasonControls}
                </SportingCalendar>
              ) : value === "teams" && season && !teamData?.items.length ? (
                <PageScrollView
                  refreshControl={
                    teamData ? (
                      <DataRefreshControl
                        refreshing={teams.isRefetching}
                        onRefresh={() => void refresh()}
                        enabled={tab === value}
                      />
                    ) : undefined
                  }
                >
                  <PageContent>
                    {identity}
                    {seasonControls}
                  </PageContent>
                  <ScreenState>
                    {!teamData ? (
                      <ReadFeedback query={teams} />
                    ) : (
                      <EmptyState title="Aucune équipe pour cette saison" />
                    )}
                  </ScreenState>
                </PageScrollView>
              ) : (
                <LegendList
                  {...hiddenScrollIndicators}
                  alwaysBounceVertical
                  recycleItems
                  refreshControl={
                    value === "info" ||
                    !data ||
                    (value === "teams" && season) ? (
                      <DataRefreshControl
                        refreshing={
                          value === "teams" && data
                            ? teams.isRefetching
                            : club.isRefetching
                        }
                        onRefresh={() => void refresh()}
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
                      <ResourceText>
                        {[item.classification.division?.name, item.season.label]
                          .filter(Boolean)
                          .join(" · ")}
                      </ResourceText>
                    </Surface>
                  )}
                  ListHeaderComponent={
                    <View style={styles.header}>
                      {identity}
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
              ),
          }))}
        />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { gap: tokens.spacing.lg, marginBottom: tokens.layout.list.gap },
  season: {
    gap: tokens.spacing.sm,
    paddingBottom: tokens.spacing.sm,
  },
});
