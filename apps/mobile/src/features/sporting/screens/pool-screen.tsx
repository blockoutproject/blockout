import { SportingPoolLoading } from "../components/sporting-loading";
import { SportingSupportAction } from "../components/sporting-actions";
import {
  PoolMap,
  PoolMapLoading,
  usePoolMapParticipants,
} from "../components/pool-map";
import { PoolStandings } from "../components/pool-standings";
import { SportingCalendar } from "../components/sporting-calendar";
import { CalendarLoading } from "../components/calendar-loading";
import { StandingsLoading } from "../components/standings-loading";
import { SportingPageHeader } from "../components/sporting-page-header";
import { PagedTabs } from "@/shared/components/paged-tabs";
import {
  SportingInitialComposition,
  type SportingInitialRead,
} from "../components/sporting-initial-composition";
import { PageHeader } from "@/shared/components/page-header";
import { PageContent } from "@/shared/components/page";
import { hashKey, useQuery } from "@tanstack/react-query";
import { useCallback, useState, type ReactNode } from "react";
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
  const [{ tab, mapVisited }, setVisit] = useState({
    tab: "standings",
    mapVisited: false,
  });
  const selectTab = useCallback((id: string) => {
    setVisit((visit) => ({
      tab: id,
      mapVisited: visit.mapVisited || id === "map",
    }));
  }, []);
  const data = pool.data;
  // Retain the participant observer after the Map's first settled visit.
  const participantRead = usePoolMapParticipants(
    data?.pool.pool.id ?? poolId,
    data !== undefined && mapVisited,
  );
  const divisionColor = data?.pool.classification.division?.color;
  const tabs = [
    { id: "standings", label: "Classement" },
    { id: "upcoming", label: "À venir" },
    { id: "completed", label: "Terminés" },
    { id: "map", label: "Carte" },
  ] as const;
  return (
    <SportingInitialComposition
      initialSceneSelected={tab === tabs[0].id}
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
          onSelect={selectTab}
          contextColor={divisionColor}
          header={
            <SportingPageHeader
              action={
                <SportingSupportAction target={{ type: "pool", id: poolId }} />
              }
              identity={data.pool.pool}
              division={data.pool.classification.division}
              kind="pool"
            />
          }
          collapsibleHeader={
            <PageContent>
              <SportingIdentity
                identity={data.pool.pool}
                kind="pool"
                classification={data.pool.classification}
                season={data.pool.season}
                subtitle={[data.pool.competitionName, data.pool.phaseName]
                  .filter(Boolean)
                  .join(" - ")}
              >
                {renderFollow?.(
                  data.pool.pool,
                  data.pool.season,
                  divisionColor,
                )}
              </SportingIdentity>
            </PageContent>
          }
          tabs={tabs.map(({ id: value, label }) => {
            const category =
              value === "upcoming" || value === "completed" ? value : undefined;
            const content = category ? (
              <SportingCalendar
                selection={{ poolId, category }}
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
              <PoolMap
                pool={data.pool}
                active={tab === value}
                participantRead={participantRead}
              />
            );
            return {
              id: value,
              label,
              content,
              preview:
                value === "map" ? (
                  <PoolMapLoading />
                ) : (
                  <PageContent>
                    {category ? (
                      <CalendarLoading category={category} />
                    ) : (
                      <StandingsLoading />
                    )}
                  </PageContent>
                ),
              fullHeight: value === "map",
              swipeDisabled: value === "map" && participantRead.interactive,
            };
          })}
        />
      )}
    </SportingInitialComposition>
  );
}
