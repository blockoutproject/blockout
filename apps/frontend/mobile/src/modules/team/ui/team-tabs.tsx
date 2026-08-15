import React, { useMemo } from "react";
import { Animated } from "react-native";

import EntityTabView from "@/src/shared/ui/entity/entity-tab-view";
import MatchList from "@/src/modules/match/ui/match-list";
import RankingTab from "@/src/modules/ranking/ui/ranking-tab";

import { MatchStatusEnum } from "@/src/shared/generated/models";
import type { TeamResponse } from "@/src/shared/generated/models";
import { layout, spacing } from "@/src/shared/theme";

/** Tabs for team: Upcoming / Finished / Pools-as-ranking. */
export type TeamTabsProps = {
  /** Enriched team entity. */
  enrichedTeam: TeamResponse;
};

const getRankingTabTitle = (pool: TeamResponse["pools"][number]) => {
  const divisionCode = pool.division.name.match(/\b[A-Z]?\d+[A-Z]?\b/i)?.[0];
  const poolCode = pool.poolCode.trim().split(/\s+/)[0];

  return `Classement · ${divisionCode ?? poolCode}`;
};

const TeamTabs: React.FC<TeamTabsProps> = ({ enrichedTeam }) => {
  const tabs = useMemo(
    () => [
      { key: "upcoming", title: "À Venir" },
      { key: "finished", title: "Terminés" },
      ...enrichedTeam.pools.map((p) => ({
        key: `pool-${p.id}`,
        title: getRankingTabTitle(p),
      })),
    ],
    [enrichedTeam.pools],
  );

  const scrollYs = useMemo(
    () =>
      Object.fromEntries(tabs.map((tab) => [tab.key, new Animated.Value(0)])),
    [tabs],
  );

  const renderedTabs = useMemo(
    () =>
      tabs.map((tab) => {
        if (tab.key === "finished" || tab.key === "upcoming") {
          return {
            ...tab,
            render: () => (
              <MatchList
                teamIds={[enrichedTeam.id]}
                status={
                  tab.key === "upcoming"
                    ? MatchStatusEnum.UPCOMING
                    : MatchStatusEnum.FINISHED
                }
                scrollY={scrollYs[tab.key]}
                headerOffset={layout.tabs}
                contentContainerStyle={[{ paddingHorizontal: spacing[1] }]}
                home={false}
              />
            ),
          };
        }

        const poolId = Number(tab.key.replace("pool-", ""));
        const pool = enrichedTeam.pools.find((p) => p.id === poolId);

        return {
          ...tab,
          render: () =>
            pool ? (
              <RankingTab
                pool={pool}
                highlightTeams={[
                  {
                    teamId: pool.ranking.find((t) => t.id === enrichedTeam.id)
                      ?.id,
                    color: `${pool.division.mainColor}`,
                  },
                ]}
              />
            ) : null,
        };
      }),
    [enrichedTeam.id, enrichedTeam.pools, scrollYs, tabs],
  );

  return <EntityTabView tabs={renderedTabs} scrollYs={scrollYs} />;
};

export default TeamTabs;
