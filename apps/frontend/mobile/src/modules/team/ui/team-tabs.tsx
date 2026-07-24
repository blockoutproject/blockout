import React, { useMemo } from "react";
import { Animated } from "react-native";

import GenericTabView from "@/src/shared/ui/generic-tab-view";
import MatchList from "@/src/modules/match/ui/MatchList";
import RankingTab from "@/src/modules/ranking/ui/ranking-tab";

import { MatchStatusEnum } from "@/src/shared/generated/models";
import type { TeamResponse } from "@/src/shared/generated/models";
import { layout } from "@/src/shared/theme";

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

  const scrollYs = useMemo(() => {
    return Object.fromEntries(
      tabs.map((tab) => [tab.key, new Animated.Value(0)]),
    );
  }, [tabs]);

  const finished = useMemo(
    () => (
      <MatchList
        teamIds={[enrichedTeam.id]}
        status={MatchStatusEnum.FINISHED}
        scrollY={scrollYs["finished"]}
        headerOffset={layout.tabs}
        contentContainerStyle={[
          {
            paddingHorizontal: 4,
          },
        ]}
        home={false}
      />
    ),
    [enrichedTeam.id, scrollYs],
  );

  const upcoming = useMemo(
    () => (
      <MatchList
        teamIds={[enrichedTeam.id]}
        status={MatchStatusEnum.UPCOMING}
        scrollY={scrollYs["upcoming"]}
        headerOffset={layout.tabs}
        contentContainerStyle={[
          {
            paddingHorizontal: 4,
          },
        ]}
        home={false}
      />
    ),
    [enrichedTeam.id, scrollYs],
  );

  const renderTabs = useMemo(
    () =>
      tabs.map((tab) => {
        if (tab.key === "finished") {
          return { ...tab, render: () => finished };
        }
        if (tab.key === "upcoming") {
          return { ...tab, render: () => upcoming };
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
    [tabs, finished, upcoming, enrichedTeam.pools, enrichedTeam.id],
  );

  return <GenericTabView tabs={renderTabs} scrollYs={scrollYs} />;
};

export default TeamTabs;
