import { SportingTeamLoading } from "../components/sporting-loading";
import { SportingSupportAction } from "../components/sporting-actions";
import { PoolParticipationLink } from "../components/pool-participation-link";
import { PoolStandings } from "../components/pool-standings";
import { SportingCalendar } from "../components/sporting-calendar";
import { CalendarLoading } from "../components/calendar-loading";
import { StandingsLoading } from "../components/standings-loading";
import {
  SportingInitialComposition,
  type SportingInitialRead,
} from "../components/sporting-initial-composition";
import { SportingPageHeader } from "../components/sporting-page-header";
import { PagedTabs } from "@/shared/components/paged-tabs";
import { PageHeader } from "@/shared/components/page-header";
import { PageContent } from "@/shared/components/page";
import { hashKey, useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import type {
  SportingIdentityResponse,
  SportingSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { useConsultationQueries } from "../api/use-consultation-queries";

import { SportingIdentity } from "../components/sporting-identity";
import { poolLabel } from "../model/resource-sections";

const calendarTabs = [
  { id: "upcoming", label: "À venir" },
  { id: "completed", label: "Terminés" },
] as const;

/** Route-owned F06 composition receives the current public identity and season. */
export interface TeamScreenProps {
  teamId: string;
  /** F06 supplies its same usable-holder read to this first composition and the single control. */
  initialFollow?: SportingInitialRead;
  renderFollow?: (
    identity: SportingIdentityResponse,
    season: SportingSeasonResponse,
    contextColor?: string,
  ) => ReactNode;
}

/** Public team page retains clubless professional teams and exact participation identities. */
export function TeamScreen(props: Readonly<TeamScreenProps>) {
  const queries = useConsultationQueries();
  return (
    <TeamPage key={hashKey(queries.team(props.teamId).queryKey)} {...props} />
  );
}

/** One follow region and aggregate calendars remain attached to the team while phase tabs change. */
function TeamPage({
  teamId,
  initialFollow,
  renderFollow,
}: Readonly<TeamScreenProps>) {
  const queries = useConsultationQueries();
  const team = useQuery(queries.team(teamId));
  const [selected, setSelected] = useState<string>(calendarTabs[0].id);
  const data = team.data;
  const divisionColor = data?.team.classification.division?.color;
  const tabs = [
    ...calendarTabs,
    ...(data?.participations ?? []).map((participation) => ({
      id: participation.pool.id,
      label: poolLabel(participation),
      participation,
    })),
  ];
  const tab = tabs.find((item) => item.id === selected) ?? calendarTabs[0];
  return (
    <SportingInitialComposition
      initialSceneSelected={tab.id === calendarTabs[0].id}
      detail={team}
      follow={initialFollow}
      canvasTint={divisionColor}
      header={
        <PageHeader
          title="L’équipe"
          action={
            <SportingSupportAction target={{ type: "team", id: teamId }} />
          }
        />
      }
      loading={<SportingTeamLoading calendar={tab.id === "upcoming"} />}
    >
      {data && (
        <PagedTabs
          selected={tab.id}
          onSelect={setSelected}
          contextColor={divisionColor}
          header={
            <SportingPageHeader
              action={
                <SportingSupportAction target={{ type: "team", id: teamId }} />
              }
              identity={data.team.team}
              division={data.team.classification.division}
              kind="team"
            />
          }
          collapsibleHeader={
            <PageContent>
              <SportingIdentity
                identity={data.team.team}
                kind="team"
                classification={data.team.classification}
                season={data.team.season}
                clubId={data.team.club?.id}
              >
                {renderFollow?.(
                  data.team.team,
                  data.team.season,
                  divisionColor,
                )}
              </SportingIdentity>
            </PageContent>
          }
          tabs={tabs.map((item) => {
            const active = tab.id === item.id;
            const isParticipation = "participation" in item;
            return {
              id: item.id,
              label: item.label,
              content: isParticipation ? (
                <PoolStandings
                  poolId={item.id}
                  divisionColor={divisionColor}
                  highlightTeamId={teamId}
                  active={active}
                >
                  <PoolParticipationLink
                    pool={item.participation}
                    active={active}
                  />
                </PoolStandings>
              ) : (
                <SportingCalendar
                  selection={{ teamId, category: item.id }}
                  active={active}
                />
              ),
              preview: (
                <PageContent>
                  {isParticipation ? (
                    <StandingsLoading />
                  ) : (
                    <CalendarLoading category={item.id} />
                  )}
                </PageContent>
              ),
            };
          })}
        />
      )}
    </SportingInitialComposition>
  );
}
