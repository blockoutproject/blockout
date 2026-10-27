import { SportingCalendar } from "../components/sporting-calendar";
import { SportingPager } from "../components/sporting-pager";
import { ResourceText } from "../components/resource-text";
import { Tabs } from "../../../shared/components/tabs";
import { ReadFeedback } from "../../../shared/components/read-feedback";
import { ScreenState } from "../../../shared/components/screen-state";
import { DataRefreshControl } from "../../../shared/components/data-refresh-control";
import { PageHeader } from "../../../shared/components/page-header";
import {
  Page,
  PageScrollView,
  PageContent,
} from "../../../shared/components/page";
import { isAccessDenied } from "../../../shared/api/access-denied";
import { useActionFeedback } from "../../../shared/components/action-feedback";
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
  const feedback = useActionFeedback();
  /** A failed explicit refresh keeps authorized content and reports only the attempted read. */
  async function refresh() {
    const result = await pool.refetch({ cancelRefetch: false });
    if (result.isError && result.data && !isAccessDenied(result.error))
      feedback.error();
  }
  const identity = data ? (
    <SportingIdentity
      identity={data.pool.pool}
      kind="pool"
      classification={data.pool.classification}
      season={data.pool.season}
      subtitle={[data.pool.competitionName, data.pool.phaseName]
        .filter(Boolean)
        .join(" · ")}
    >
      {renderFollow?.(
        data.pool.pool,
        data.pool.season,
        data.pool.classification.division?.color,
      )}
    </SportingIdentity>
  ) : undefined;
  const toolbar = (
    <Tabs
      selected={tab}
      onSelect={setTab}
      items={[
        { id: "standings", label: "Classement" },
        { id: "upcoming", label: "À venir" },
        { id: "completed", label: "Terminés" },
        { id: "map", label: "Carte" },
      ]}
    />
  );
  const blockingState = !data ? <ReadFeedback query={pool} /> : undefined;
  return (
    <Page>
      <PageHeader title="Poule" />
      {blockingState ? (
        <PageScrollView
          refreshControl={
            <DataRefreshControl
              refreshing={pool.isRefetching}
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
          panels={(["standings", "upcoming", "completed", "map"] as const).map(
            (value) => ({
              id: value,
              content:
                value === "upcoming" || value === "completed" ? (
                  <SportingCalendar
                    selection={{ poolId, category: value }}
                    header={identity}
                    toolbar={toolbar}
                    active={tab === value}
                  />
                ) : (
                  <PageScrollView>
                    <PageContent>
                      {identity}
                      {toolbar}
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
            }),
          )}
        />
      )}
    </Page>
  );
}
