import { SportingSupportAction } from "../components/sporting-actions";
import { PoolMap } from "../components/pool-map";
import { PoolStandings } from "../components/pool-standings";
import { SportingCalendar } from "../components/sporting-calendar";
import { SportingPageHeader } from "../components/sporting-page-header";
import { PagedTabs } from "../../../shared/components/paged-tabs";
import { ResourceText } from "../components/resource-text";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { PageHeader } from "../../../shared/components/page-header";
import {
  Page,
  PageScrollView,
  PageContent,
} from "../../../shared/components/page";
import { hashKey, useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import type {
  SportingIdentityResponse,
  SportingSeasonResponse,
  PoolSummaryResponse,
} from "../../../../.generated/schemas/index.zod";
import { useConsultationQueries } from "../api/use-consultation-queries";

import { SportingIdentity } from "../components/sporting-identity";
import type { RenderStandings } from "../model/resource-sections";

/** Independent pool content comes from its owning stories; absence creates no invented table/map. */
export interface PoolScreenProps {
  poolId: string;
  renderFollow?: (
    identity: SportingIdentityResponse,
    season: SportingSeasonResponse,
    contextColor?: string,
  ) => ReactNode;
  renderStandings?: RenderStandings;
  renderMap?: (pool: PoolSummaryResponse) => ReactNode;
}

/** Opens one exact pool/phase without an entitlement dependency. */
export function PoolScreen(props: PoolScreenProps) {
  const queries = useConsultationQueries();
  return (
    <PoolPage key={hashKey(queries.pool(props.poolId).queryKey)} {...props} />
  );
}

/** Keeps public pool metadata usable while the independently owned active tab is unavailable. */
function PoolPage({
  poolId,
  renderFollow,
  renderStandings,
  renderMap,
}: PoolScreenProps) {
  const queries = useConsultationQueries();
  const pool = useQuery(queries.pool(poolId));
  const [tab, setTab] = useState("standings");
  const data = pool.data;
  const identity = data ? (
    <SportingIdentity
      identity={data.pool.pool}
      kind="pool"
      classification={data.pool.classification}
      season={data.pool.season}
      subtitle={[data.pool.competitionName, data.pool.phaseName]
        .filter(Boolean)
        .join(" · ")}
    />
  ) : undefined;
  const tabs = [
    { id: "standings", label: "Classement" },
    { id: "upcoming", label: "À venir" },
    { id: "completed", label: "Terminés" },
    { id: "map", label: "Carte" },
  ] as const;
  const blockingState = !data ? <ReadFeedback query={pool} /> : undefined;
  return (
    <Page>
      {blockingState ? (
        <>
          <PageHeader
            title="Poule"
            action={
              <SportingSupportAction target={{ type: "pool", id: poolId }} />
            }
          />
          <PageScrollView>
            <ScreenState>{blockingState}</ScreenState>
          </PageScrollView>
        </>
      ) : (
        <PagedTabs
          selected={tab}
          onSelect={setTab}
          header={
            data && (
              <>
                <SportingPageHeader
                  action={
                    <SportingSupportAction
                      target={{ type: "pool", id: poolId }}
                    />
                  }
                  identity={data.pool.pool}
                  division={data.pool.classification.division}
                  kind="pool"
                />
                {renderFollow?.(
                  data.pool.pool,
                  data.pool.season,
                  data.pool.classification.division?.color,
                )}
              </>
            )
          }
          tabs={tabs.map(({ id: value, label }) => ({
            id: value,
            label,
            content:
              value === "upcoming" || value === "completed" ? (
                <SportingCalendar
                  selection={{ poolId, category: value }}
                  active={tab === value}
                >
                  {identity}
                </SportingCalendar>
              ) : value === "standings" && data && !renderStandings ? (
                <PoolStandings pool={data.pool} active={tab === value}>
                  {identity}
                </PoolStandings>
              ) : value === "map" && data && !renderMap ? (
                <PoolMap pool={data.pool} active={tab === value}>
                  {identity}
                </PoolMap>
              ) : (
                <PageScrollView alwaysBounceVertical>
                  <PageContent>
                    {identity}
                    {data &&
                      (value === "standings"
                        ? (renderStandings?.(data.pool) ?? (
                            <ResourceText>
                              Classement indisponible pour le moment
                            </ResourceText>
                          ))
                        : (renderMap?.(data.pool) ?? (
                            <ResourceText>
                              Carte indisponible pour le moment
                            </ResourceText>
                          )))}
                  </PageContent>
                </PageScrollView>
              ),
          }))}
        />
      )}
    </Page>
  );
}
