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
import {
  ResourceFeedback,
  ResourcePage,
  ResourceTabs,
  ResourceText,
} from "../components/resource-page";
import { SportingIdentity } from "../components/sporting-identity";
import type {
  PoolCalendarSelection,
  RenderStandings,
} from "../model/resource-sections";

/** Independent pool content comes from its owning stories; absence creates no invented table/map. */
export interface PoolScreenProps {
  poolId: string;
  renderFollow?: (
    identity: SportingIdentityResponse,
    season: SportingSeasonResponse,
    contextColor?: string,
  ) => ReactNode;
  renderCalendar?: (selection: PoolCalendarSelection) => ReactNode;
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
  renderCalendar,
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
  return (
    <ResourcePage
      state={!data ? <ResourceFeedback query={pool} /> : undefined}
      title="Poule"
      refreshing={pool.isRefetching}
      onRefresh={!data ? () => void refresh() : undefined}
    >
      {data && (
        <>
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
          <ResourceTabs
            selected={tab}
            onSelect={setTab}
            items={[
              { id: "standings", label: "Classement" },
              { id: "upcoming", label: "À venir" },
              { id: "completed", label: "Terminés" },
              { id: "map", label: "Carte" },
            ]}
          />
          {tab === "standings"
            ? (renderStandings?.(data.pool) ?? (
                <ResourceText>
                  Classement indisponible pour le moment
                </ResourceText>
              ))
            : tab === "map"
              ? (renderMap?.(data.pool) ?? (
                  <ResourceText>Carte indisponible pour le moment</ResourceText>
                ))
              : (renderCalendar?.({
                  poolId,
                  category: tab === "completed" ? "completed" : "upcoming",
                }) ?? (
                  <ResourceText>
                    Calendrier indisponible pour le moment
                  </ResourceText>
                ))}
        </>
      )}
    </ResourcePage>
  );
}
