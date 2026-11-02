import {
  SportingPresentationAction,
  SportingSupportAction,
} from "../components/sporting-actions";
import { PoolStandings } from "../components/pool-standings";
import { SportingCalendar } from "../components/sporting-calendar";
import { SportingPageHeader } from "../components/sporting-page-header";
import { SportingTabs, SportingScrollView } from "../components/sporting-tabs";
import { ResourceText } from "../components/resource-text";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { PageHeader } from "../../../shared/components/page-header";
import {
  Page,
  PageScrollView,
  PageContent,
} from "../../../shared/components/page";
import { Surface } from "../../../shared/components/surface";
import { hashKey, useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import type {
  SportingIdentityResponse,
  SportingSeasonResponse,
} from "../../../../.generated/schemas/index.zod";
import { useConsultationQueries } from "../api/use-consultation-queries";

import {
  SportingIdentity,
  SportingLink,
} from "../components/sporting-identity";
import { poolLabel, type RenderStandings } from "../model/resource-sections";

/** Route-owned F06 and optional standings compositions receive stable public identities. */
export interface TeamScreenProps {
  teamId: string;
  renderFollow?: (
    identity: SportingIdentityResponse,
    season: SportingSeasonResponse,
    contextColor?: string,
  ) => ReactNode;
  renderStandings?: RenderStandings;
}

/** Public team page retains clubless professional teams and exact participation identities. */
export function TeamScreen(props: TeamScreenProps) {
  const queries = useConsultationQueries();
  return (
    <TeamPage key={hashKey(queries.team(props.teamId).queryKey)} {...props} />
  );
}

/** One follow region and aggregate calendars remain attached to the team while phase tabs change. */
function TeamPage({ teamId, renderFollow, renderStandings }: TeamScreenProps) {
  const queries = useConsultationQueries();
  const team = useQuery(queries.team(teamId));
  const [selected, setSelected] = useState<string>();
  const data = team.data;
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
    : (data?.participations[0]?.pool.id ?? "upcoming");
  /** One shared identity owns its club link and the single follow lifetime above all scenes. */
  const identity = data ? (
    <SportingIdentity
      identity={data.team.team}
      kind="team"
      classification={data.team.classification}
      season={data.team.season}
      clubId={data.team.club?.id}
    >
      <SportingPresentationAction target={{ kind: "team", id: teamId }} />
      {renderFollow?.(
        data.team.team,
        data.team.season,
        data.team.classification.division?.color,
      )}
    </SportingIdentity>
  ) : undefined;
  const blockingState = !data ? <ReadFeedback query={team} /> : undefined;
  return (
    <Page>
      {blockingState ? (
        <>
          <PageHeader
            title="Équipe"
            action={
              <SportingSupportAction target={{ type: "team", id: teamId }} />
            }
          />
          <PageScrollView>
            <ScreenState>{blockingState}</ScreenState>
          </PageScrollView>
        </>
      ) : (
        <SportingTabs
          selected={tab ?? "upcoming"}
          onSelect={setSelected}
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
          identity={<PageContent>{identity}</PageContent>}
          tabs={tabs.map((item) => {
            const participation = data?.participations.find(
              (pool) => pool.pool.id === item.id,
            );
            const category =
              item.id === "upcoming" || item.id === "completed"
                ? item.id
                : undefined;
            return {
              id: item.id,
              label: item.label,
              content: category ? (
                <SportingCalendar
                  selection={{ teamId, category }}
                  active={tab === item.id}
                />
              ) : participation && !renderStandings ? (
                <PoolStandings
                  pool={participation}
                  highlightTeamId={teamId}
                  active={tab === item.id}
                >
                  <Surface>
                    <SportingLink
                      key={participation.pool.id}
                      kind="pool"
                      active={tab === item.id}
                      id={participation.pool.id}
                      label={poolLabel(participation)}
                      identity={participation.classification.division}
                    />
                  </Surface>
                </PoolStandings>
              ) : (
                <SportingScrollView alwaysBounceVertical>
                  <PageContent>
                    {participation && (
                      <>
                        <Surface>
                          <SportingLink
                            key={participation.pool.id}
                            kind="pool"
                            active={tab === item.id}
                            id={participation.pool.id}
                            label={poolLabel(participation)}
                            identity={participation.classification.division}
                          />
                        </Surface>
                        {renderStandings?.(participation) ?? (
                          <ResourceText>
                            Classement indisponible pour le moment
                          </ResourceText>
                        )}
                      </>
                    )}
                  </PageContent>
                </SportingScrollView>
              ),
            };
          })}
        />
      )}
    </Page>
  );
}
