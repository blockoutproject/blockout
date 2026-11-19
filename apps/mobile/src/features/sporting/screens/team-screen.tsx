import { SportingTeamLoading } from "../components/sporting-loading";
import { SportingSupportAction } from "../components/sporting-actions";
import { PoolParticipationLink } from "../components/pool-participation-link";
import { PoolStandings } from "../components/pool-standings";
import { SportingCalendar } from "../components/sporting-calendar";
import {
  sportingIdentityHeaderMinHeight,
  SportingInitialComposition,
  type SportingInitialRead,
  useStandingsCalendarPreview,
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
  const [selected, setSelected] = useState<string>();
  const { onStandingsReady, preview } = useStandingsCalendarPreview(
    "completed",
    team,
    initialFollow,
  );
  const data = team.data;
  const firstParticipation = data?.participations[0]?.pool.id;
  const divisionColor = data?.team.classification.division?.color;
  const tabs = [
    { id: "upcoming", label: "À venir" },
    { id: "completed", label: "Terminés" },
    ...(data?.participations ?? []).map((pool) => ({
      id: pool.pool.id,
      label: poolLabel(pool),
    })),
  ];
  const tab = tabs.some((item) => item.id === selected)
    ? selected
    : (firstParticipation ?? "upcoming");
  /** One shared identity owns its club link and the single follow lifetime above all scenes. */
  const identity = data ? (
    <SportingIdentity
      identity={data.team.team}
      kind="team"
      classification={data.team.classification}
      season={data.team.season}
      clubId={data.team.club?.id}
    >
      {renderFollow?.(data.team.team, data.team.season, divisionColor)}
    </SportingIdentity>
  ) : undefined;
  return (
    <SportingInitialComposition
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
      loading={<SportingTeamLoading calendar={!!data && tab === "upcoming"} />}
    >
      {data && (
        <PagedTabs
          selected={tab ?? "upcoming"}
          onSelect={setSelected}
          contextColor={divisionColor}
          header={
            data && (
              <SportingPageHeader
                action={
                  <SportingSupportAction
                    target={{ type: "team", id: teamId }}
                  />
                }
                identity={data.team.team}
                kind="team"
              />
            )
          }
          collapsibleHeader={<PageContent>{identity}</PageContent>}
          collapsibleHeaderMinHeight={sportingIdentityHeaderMinHeight}
          tabs={tabs.map((item) => {
            const participation = data.participations.find(
              (pool) => pool.pool.id === item.id,
            );
            const category =
              item.id === "upcoming" || item.id === "completed"
                ? item.id
                : undefined;
            const content = category ? (
              <SportingCalendar
                selection={{ teamId, category }}
                active={tab === item.id}
              />
            ) : participation ? (
              <PoolStandings
                poolId={participation.pool.id}
                divisionColor={divisionColor}
                highlightTeamId={teamId}
                active={tab === item.id}
                onReady={
                  item.id === firstParticipation ? onStandingsReady : undefined
                }
              >
                <PoolParticipationLink
                  pool={participation}
                  active={tab === item.id}
                />
              </PoolStandings>
            ) : null;
            return {
              id: item.id,
              label: item.label,
              content,
              preview: item.id === "completed" ? preview : undefined,
            };
          })}
        />
      )}
    </SportingInitialComposition>
  );
}
