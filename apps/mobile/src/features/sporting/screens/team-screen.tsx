import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import type {
  SportingIdentityResponse,
  SportingSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { useConsultationQueries } from "../api/use-consultation-queries";
import {
  ResourceCard,
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
  poolLabel,
  type RenderStandings,
  type TeamCalendarSelection,
} from "../model/resource-sections";

/** Optional F06/later-story owner compositions receive stable identities, independently of public reads. */
export interface TeamScreenProps {
  teamId: string;
  renderFollow?: (
    identity: SportingIdentityResponse,
    season: SportingSeasonResponse,
    contextColor?: string,
  ) => ReactNode;
  renderCalendar?: (selection: TeamCalendarSelection) => ReactNode;
  renderStandings?: RenderStandings;
}

/** Public team page retains clubless professional teams and exact participation identities. */
export function TeamScreen(props: TeamScreenProps) {
  const queries = useConsultationQueries();
  return (
    <TeamPage
      key={JSON.stringify(queries.team(props.teamId).queryKey)}
      {...props}
    />
  );
}

/** One follow region and aggregate calendars remain attached to the team while phase tabs change. */
function TeamPage({
  teamId,
  renderFollow,
  renderCalendar,
  renderStandings,
}: TeamScreenProps) {
  const queries = useConsultationQueries();
  const team = useQuery({
    ...queries.team(teamId),
    refetchOnMount: "always",
    retryOnMount: true,
  });
  const [selected, setSelected] = useState<string>();
  const data = team.data;
  const tabs = [
    { id: "upcoming", label: "À venir" },
    { id: "completed", label: "Terminés" },
    ...(data?.participations ?? []).map((pool) => ({
      id: pool.pool.id,
      label: `Classement ${poolLabel(pool)}`,
    })),
  ];
  const tab = tabs.some((item) => item.id === selected)
    ? selected
    : (data?.participations[0]?.pool.id ?? "upcoming");
  const participation = data?.participations.find(
    (item) => item.pool.id === tab,
  );
  return (
    <ResourcePage title="Équipe">
      <ResourceFeedback query={team} />
      {data && (
        <>
          <SportingIdentity
            identity={data.team.team}
            kind="team"
            classification={data.team.classification}
            season={data.team.season}
          >
            {data.team.club && (
              <SportingLink
                kind="club"
                id={data.team.club.id}
                label={`Voir le club ${data.team.club.name}`}
              />
            )}
            {renderFollow?.(
              data.team.team,
              data.team.season,
              data.team.classification.division?.color,
            )}
          </SportingIdentity>
          <ResourceTabs
            selected={tab ?? "upcoming"}
            onSelect={setSelected}
            items={tabs}
          />
          {participation ? (
            <>
              <ResourceCard>
                <SportingLink
                  kind="pool"
                  id={participation.pool.id}
                  label={poolLabel(participation)}
                  identity={participation.classification.division}
                />
                <ResourceText>{participation.competitionName}</ResourceText>
              </ResourceCard>
              {renderStandings?.(participation) ?? (
                <ResourceText>
                  Classement indisponible pour le moment
                </ResourceText>
              )}
            </>
          ) : (
            (renderCalendar?.({
              teamId,
              category: tab === "completed" ? "completed" : "upcoming",
            }) ?? (
              <ResourceText>
                Calendrier indisponible pour le moment
              </ResourceText>
            ))
          )}
        </>
      )}
    </ResourcePage>
  );
}
