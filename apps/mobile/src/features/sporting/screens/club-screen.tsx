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
  ResourceFeedback,
  ResourcePage,
  ResourceTabs,
  ResourceText,
} from "../components/resource-page";
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
  return (
    <ResourcePage title="Club" scroll={false}>
      <FlatList
        alwaysBounceVertical
        refreshControl={
          tab === "info" || !data || (tab === "teams" && season) ? (
            <DataRefreshControl
              refreshing={
                tab === "teams" && data ? teams.isFetching : club.isFetching
              }
              onRefresh={() => {
                if (tab === "teams" && data && season)
                  void teams.refetch({ cancelRefetch: false });
                else void club.refetch({ cancelRefetch: false });
              }}
            />
          ) : undefined
        }
        contentContainerStyle={styles.content}
        data={data && tab === "teams" ? (teamData?.items ?? []) : []}
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
              {[item.classification.division?.name, item.season.label]
                .filter(Boolean)
                .join(" · ")}
            </ResourceText>
          </Surface>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <ResourceFeedback query={club} />
            {data && (
              <>
                <SportingIdentity
                  identity={data.club}
                  kind="club"
                  subtitle={[data.contacts.city, data.contacts.postalCode]
                    .filter(Boolean)
                    .join(" ")}
                />
                <ResourceTabs
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
                {tab === "info" ? (
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
                  </>
                ) : (
                  season &&
                  (tab === "teams" ? (
                    <>
                      <ResourceFeedback query={teams} />
                      {teamData?.items.length === 0 && (
                        <ResourceText>
                          Aucune équipe pour cette saison
                        </ResourceText>
                      )}
                    </>
                  ) : (
                    (renderCalendar?.({
                      clubId,
                      seasonId: season.id,
                      category: tab === "completed" ? "completed" : "upcoming",
                    }) ?? (
                      <ResourceText>
                        Calendrier indisponible pour le moment
                      </ResourceText>
                    ))
                  ))
                )}
              </>
            )}
          </View>
        }
      />
    </ResourcePage>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: tokens.spacing.lg,
    paddingTop: tokens.spacing.sm,
    paddingBottom: tokens.spacing.section,
    gap: tokens.spacing.md,
  },
  header: { gap: tokens.spacing.md },
});
