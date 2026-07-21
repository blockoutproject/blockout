import React, { useMemo } from "react";
import { Animated } from "react-native";

import GenericTabView from "@/src/shared/ui/GenericTabView";
import MatchList from "@/src/modules/match/ui/MatchList";
import RankingTab from "@/src/modules/ranking/ui/RankingTab";

import { MatchStatus } from "@/src/modules/match/model/Match";
import type { TeamResponse } from "@/src/modules/team/model/Team";
import { TABBAR_HEIGHT } from "@/src/shared/theme/tokens";

/** Tabs for team: Upcoming / Finished / Pools-as-ranking. */
export type TeamTabsProps = {
  /** Enriched team entity. */
  enrichedTeam: TeamResponse;
};

const TeamTabs: React.FC<TeamTabsProps> = ({ enrichedTeam }) => {
  const tabs = useMemo(
    () => [
      { key: "upcoming", title: "À Venir" },
      { key: "finished", title: "Terminés" },
      ...enrichedTeam.pools.map((p) => ({
        key: `pool-${p.id}`,
        title: p.shortName,
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
        status={MatchStatus.FINISHED}
        scrollY={scrollYs["finished"]}
        headerOffset={TABBAR_HEIGHT}
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
        status={MatchStatus.UPCOMING}
        scrollY={scrollYs["upcoming"]}
        headerOffset={TABBAR_HEIGHT}
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
