import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import type {
  SportingIdentityResponse,
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
  renderFollow?: (identity: SportingIdentityResponse) => ReactNode;
  renderCalendar?: (selection: PoolCalendarSelection) => ReactNode;
  renderStandings?: RenderStandings;
  renderMap?: (pool: PoolSummaryResponse) => ReactNode;
}

/** Opens one exact pool/phase without an entitlement dependency. */
export function PoolScreen(props: PoolScreenProps) {
  const queries = useConsultationQueries();
  return (
    <PoolPage
      key={JSON.stringify(queries.pool(props.poolId).queryKey)}
      {...props}
    />
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
  const pool = useQuery({
    ...queries.pool(poolId),
    refetchOnMount: "always",
    retryOnMount: true,
  });
  const [tab, setTab] = useState("standings");
  const data = pool.data;
  return (
    <ResourcePage title="Poule">
      <ResourceFeedback query={pool} />
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
            {renderFollow?.(data.pool.pool)}
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
