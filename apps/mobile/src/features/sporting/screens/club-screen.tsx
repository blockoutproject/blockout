import { SportingCalendar } from "../components/sporting-calendar";
import { SportingPager } from "../components/sporting-pager";
import { ListSeparator } from "../../../shared/components/list-separator";
import { ResourceText } from "../components/resource-text";
import { Tabs } from "../../../shared/components/tabs";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { PageHeader } from "../../../shared/components/page-header";
import {
  Page,
  PageScrollView,
  pageContentStyle,
} from "../../../shared/components/page";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { EmptyState } from "../../../shared/components/state-card";
import { useActionFeedback } from "../../../shared/components/action-feedback";
import { Surface } from "../../../shared/components/surface";
import { hashKey, useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Globe, Mail, MapPin, Phone } from "lucide-react-native";
import { FlatList, StyleSheet, View } from "react-native";
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
import type { ClubCalendarSelection } from "../model/resource-sections";

/** Resource identity plus the calendar owner's optional active-tab composition boundary. */
export interface ClubScreenProps {
  clubId: string;
  renderCalendar?: (selection: ClubCalendarSelection) => ReactNode;
}

/** Opens public club information without waiting for an account or entitlement. */
export function ClubScreen(props: ClubScreenProps) {
  const queries = useConsultationQueries();
  return (
    <ClubPage key={hashKey(queries.club(props.clubId).queryKey)} {...props} />
  );
}

/** Retains a valid season across common reads; only successful disappearance derives the fallback. */
function ClubPage({ clubId, renderCalendar }: ClubScreenProps) {
  const queries = useConsultationQueries();
  const club = useQuery(queries.club(clubId));
  const [tab, setTab] = useState("info");
  const [selectedSeason, setSelectedSeason] = useState<string>();
  const [choosingSeason, setChoosingSeason] = useState(false);
  const data = club.data;
  const feedback = useActionFeedback();
  const seasons = data?.seasons ?? [];
  const season =
    seasons.find((item) => item.id === selectedSeason) ?? seasons[0];
  // Reconcile only a successful current representation, so a failed read never discards the choice.
  if (club.isSuccess && selectedSeason !== season?.id)
    setSelectedSeason(season?.id);
  const teams = useQuery({
    ...queries.clubTeams(clubId, season?.id ?? ""),
    enabled: !!data && !!season && tab === "teams",
    staleTime: Infinity,
  });
  const teamData = teams.data?.seasonId === season?.id ? teams.data : undefined;
  /** Only the displayed scope refreshes; a failed read leaves authorized information visible. */
  async function refresh() {
    const result =
      tab === "teams" && data && season
        ? await teams.refetch({ cancelRefetch: false })
        : await club.refetch({ cancelRefetch: false });
    if (result.isError && result.data && !isAccessDenied(result.error))
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
  const toolbar = (
    <>
      <Tabs
        selected={tab}
        onSelect={setTab}
        items={[
          { id: "info", label: "Infos" },
          { id: "teams", label: "Équipes" },
          { id: "upcoming", label: "À venir" },
          { id: "completed", label: "Terminés" },
        ]}
      />
      {tab !== "info" && (
        <>
          {season ? (
            <Button
              variant="secondary"
              label={`Saison ${season.label}`}
              onPress={() => setChoosingSeason(!choosingSeason)}
            />
          ) : (
            <ResourceText>Aucune saison disponible</ResourceText>
          )}
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
        </>
      )}
    </>
  );
  const blockingState = !data ? <ReadFeedback query={club} /> : undefined;
  return (
    <Page>
      <PageHeader title="Club" />
      {blockingState ? (
        <PageScrollView
          refreshControl={
            <DataRefreshControl
              refreshing={club.isRefetching}
              onRefresh={() => void refresh()}
            />
          }
        >
          <ScreenState>{blockingState}</ScreenState>
        </PageScrollView>
      ) : (
        <SportingPager
          selected={tab}
          onSelect={setTab}
          panels={(["info", "teams", "upcoming", "completed"] as const).map(
            (value) => ({
              id: value,
              content:
                (value === "upcoming" || value === "completed") &&
                season &&
                !renderCalendar ? (
                  <SportingCalendar
                    key={season.id}
                    selection={{ clubId, seasonId: season.id, category: value }}
                    header={identity}
                    toolbar={toolbar}
                    active={tab === value}
                  />
                ) : (
                  <FlatList
                    alwaysBounceVertical
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
                        />
                      ) : undefined
                    }
                    contentContainerStyle={pageContentStyle}
                    ItemSeparatorComponent={ListSeparator}
                    data={
                      data && value === "teams" ? (teamData?.items ?? []) : []
                    }
                    keyExtractor={(item) => item.team.id}
                    renderItem={({ item }) => (
                      <Surface>
                        <SportingLink
                          kind="team"
                          id={item.team.id}
                          identity={item.team}
                          label={item.team.name}
                        />
                        <ResourceText>
                          {[
                            item.classification.division?.name,
                            item.season.label,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </ResourceText>
                      </Surface>
                    )}
                    ListHeaderComponent={
                      <View style={styles.header}>
                        {data && (
                          <>
                            {identity}
                            {toolbar}
                            {value === "info" ? (
                              <>
                                <Surface>
                                  <ResourceText>Coordonnées</ResourceText>
                                  <ContactLink
                                    label="Site web"
                                    value={data.contacts.website}
                                    destination={safeWebsite(
                                      data.contacts.website,
                                    )}
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
                            ) : (
                              season &&
                              (value === "teams" ? (
                                <>
                                  {!teamData && <ReadFeedback query={teams} />}
                                  {teamData?.items.length === 0 && (
                                    <EmptyState title="Aucune équipe pour cette saison" />
                                  )}
                                </>
                              ) : (
                                (renderCalendar?.({
                                  clubId,
                                  seasonId: season.id,
                                  category:
                                    value === "completed"
                                      ? "completed"
                                      : "upcoming",
                                }) ?? null)
                              ))
                            )}
                          </>
                        )}
                      </View>
                    }
                  />
                ),
            }),
          )}
        />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  header: { gap: tokens.spacing.lg, marginBottom: tokens.layout.list.gap },
});
