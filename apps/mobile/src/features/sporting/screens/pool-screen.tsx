import { SportingPoolLoading } from "../components/sporting-loading";
import { SportingSupportAction } from "../components/sporting-actions";
import { PoolMap } from "../components/pool-map";
import { PoolStandings } from "../components/pool-standings";
import { SportingCalendar } from "../components/sporting-calendar";
import { SportingPageHeader } from "../components/sporting-page-header";
import { PagedTabs } from "@/shared/components/paged-tabs";
import {
  SportingInitialComposition,
  type SportingInitialRead,
} from "../components/sporting-initial-composition";
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

/** Route-owned F06 composition receives the current public identity and season. */
export interface PoolScreenProps {
  poolId: string;
  /** The single F06 reader is shared with its control, without coupling public count to admission. */
  initialFollow?: SportingInitialRead;
  renderFollow?: (
    identity: SportingIdentityResponse,
    season: SportingSeasonResponse,
    contextColor?: string,
  ) => ReactNode;
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
}: Readonly<PoolScreenProps>) {
  const queries = useConsultationQueries();
  const pool = useQuery(queries.pool(poolId));
  const [tab, setTab] = useState("standings");
  const data = pool.data;
  const divisionColor = data?.pool.classification.division?.color;
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
      {renderFollow?.(data.pool.pool, data.pool.season, divisionColor)}
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
      canvasTint={divisionColor}
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
        <PagedTabs
          selected={tab}
          onSelect={setTab}
          contextColor={divisionColor}
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
          collapsibleHeader={<PageContent>{identity}</PageContent>}
          tabs={tabs.map(({ id: value, label }) => {
            const content =
              value === "upcoming" || value === "completed" ? (
                <SportingCalendar
                  selection={{ poolId, category: value }}
                  active={tab === value}
                />
              ) : value === "standings" ? (
                <PoolStandings
                  poolId={data.pool.pool.id}
                  divisionColor={divisionColor}
                  active={tab === value}
                  refreshEmpty={false}
                />
              ) : (
                <PoolMap pool={data.pool} active={tab === value} />
              );
            return {
              id: value,
              label,
              content,
              fullHeight: value === "map",
            };
          })}
        />
      )}
    </SportingInitialComposition>
  );
}
