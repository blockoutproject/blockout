import { hiddenScrollIndicators } from "../../../shared/native/scroll-indicators";
import { SportingSupportAction } from "../components/sporting-actions";
import { PoolStandings } from "../components/pool-standings";
import { SportingCalendar } from "../components/sporting-calendar";
import { SportingCompactHeader } from "../components/sporting-compact-header";
import { TabScrollView } from "react-native-collapsible-tab";
import { PagedTabs } from "../../../shared/components/paged-tabs";
import { BottomContentSpacer } from "../../../shared/components/bottom-content-inset";
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

/** Optional F06/later-story owner compositions receive stable identities, independently of public reads. */
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
      label: `Classement ${poolLabel(pool)}`,
    })),
  ];
  const tab = tabs.some((item) => item.id === selected)
    ? selected
    : (data?.participations[0]?.pool.id ?? "upcoming");
  const identity = data ? (
    <SportingIdentity
      identity={data.team.team}
      kind="team"
      classification={data.team.classification}
      season={data.team.season}
    >
      {data.team.club && (
        <SportingLink
          key={data.team.club.id}
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
  ) : undefined;
  const blockingState = !data ? <ReadFeedback query={team} /> : undefined;
  return (
    <Page edges={blockingState ? undefined : ["left", "right", "bottom"]}>
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
        <PagedTabs
          selected={tab ?? "upcoming"}
          onSelect={setSelected}
          header={
            data && (
              <SportingCompactHeader
                action={
                  <SportingSupportAction
                    target={{ type: "team", id: teamId }}
                  />
                }
                title="Équipe"
                identity={data.team.team}
                kind="team"
              />
            )
          }
          collapsibleHeader={<PageContent>{identity}</PageContent>}
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
                    <ResourceText>{participation.competitionName}</ResourceText>
                  </Surface>
                </PoolStandings>
              ) : (
                <TabScrollView {...hiddenScrollIndicators} alwaysBounceVertical>
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
                          <ResourceText>
                            {participation.competitionName}
                          </ResourceText>
                        </Surface>
                        {renderStandings?.(participation) ?? (
                          <ResourceText>
                            Classement indisponible pour le moment
                          </ResourceText>
                        )}
                      </>
                    )}
                  </PageContent>
                  <BottomContentSpacer />
                </TabScrollView>
              ),
            };
          })}
        />
      )}
    </Page>
  );
}
