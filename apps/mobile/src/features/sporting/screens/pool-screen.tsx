import { SportingPoolLoading } from "../components/sporting-loading";
import { SportingSupportAction } from "../components/sporting-actions";
import { PoolMap } from "../components/pool-map";
import { PoolStandings } from "../components/pool-standings";
import { SportingCalendar } from "../components/sporting-calendar";
import { SportingPageHeader } from "../components/sporting-page-header";
import { SportingTabs } from "../components/sporting-tabs";
import { ResourceText } from "../components/resource-text";
import {
  SportingInitialComposition,
  type SportingInitialRead,
} from "../components/sporting-initial-composition";
import { PageHeader } from "../../../shared/components/page-header";
import { PageScrollView, PageContent } from "../../../shared/components/page";
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

/** Route-owned F06 and optional standings/map compositions retain their independent owners. */
export interface PoolScreenProps {
  poolId: string;
  /** The single F06 reader is shared with its control, without coupling public count to admission. */
  initialFollow?: SportingInitialRead;
  renderFollow?: (
    identity: SportingIdentityResponse,
    season: SportingSeasonResponse,
    contextColor?: string,
  ) => ReactNode;
  renderStandings?: RenderStandings;
  renderMap?: (pool: PoolSummaryResponse) => ReactNode;
}

/** Opens one exact pool/phase without an entitlement dependency. */
export function PoolScreen(props: Readonly<PoolScreenProps>) {
  const queries = useConsultationQueries();
  return (
    <PoolPage key={hashKey(queries.pool(props.poolId).queryKey)} {...props} />
  );
}

/** Admits the first useful pool composition, then retains its identity while later scenes recover independently. */
function PoolPage({
  poolId,
  initialFollow,
  renderFollow,
  renderStandings,
  renderMap,
}: Readonly<PoolScreenProps>) {
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
    >
      {renderFollow?.(
        data.pool.pool,
        data.pool.season,
        data.pool.classification.division?.color,
      )}
    </SportingIdentity>
  ) : undefined;
  const tabs = [
    { id: "standings", label: "Classement" },
    { id: "upcoming", label: "À venir" },
    { id: "completed", label: "Terminés" },
    { id: "map", label: "Carte" },
  ] as const;
  return (
    <SportingInitialComposition
      detail={pool}
      follow={initialFollow}
      header={
        <PageHeader
          title="La poule"
          action={
            <SportingSupportAction target={{ type: "pool", id: poolId }} />
          }
        />
      }
      loading={<SportingPoolLoading />}
    >
      {data && (
        <SportingTabs
          selected={tab}
          onSelect={setTab}
          header={
            data && (
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
            )
          }
          identity={<PageContent>{identity}</PageContent>}
          tabs={tabs.map(({ id: value, label }) => {
            /** Selects the pool’s current native calendar, standings or map panel. */
            function renderPoolTab() {
              if (value === "upcoming" || value === "completed") {
                return (
                  <SportingCalendar
                    selection={{ poolId, category: value }}
                    active={tab === value}
                  />
                );
              }
              if (value === "standings" && data && !renderStandings) {
                return (
                  <PoolStandings
                    pool={data.pool}
                    active={tab === value}
                    replaceOnFailure
                  />
                );
              }
              if (value === "map" && data && !renderMap) {
                return <PoolMap pool={data.pool} active={tab === value} />;
              }
              return (
                <PageScrollView alwaysBounceVertical>
                  <PageContent>
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
              );
            }

            return {
              id: value,
              label,
              content: renderPoolTab(),
            };
          })}
        />
      )}
    </SportingInitialComposition>
  );
}
