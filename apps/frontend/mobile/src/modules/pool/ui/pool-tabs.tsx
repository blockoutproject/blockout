import React, { useMemo, useRef } from "react";
import { Animated } from "react-native";

import EntityTabView from "@/src/shared/ui/entity/entity-tab-view";
import MatchList from "@/src/modules/match/ui/match-list";
import RankingTab from "@/src/modules/ranking/ui/ranking-tab";
import ProUpsellTab from "@/src/modules/subscription/ui/pro-upsell-tab";

import { MatchStatusEnum } from "@/src/shared/generated/models";
import type { PoolResponse } from "@/src/shared/generated/models";
import { layout } from "@/src/shared/theme";
import PoolMapTab from "./pool-map-tab";
import { usePurchases } from "@/src/modules/subscription/providers/purchases-provider";

/** Tabs for pool: Ranking / Upcoming / Finished / Map. */
export type PoolTabsProps = {
  /** Enriched pool entity. */
  enrichedPool: PoolResponse;
};

const POOL_TABS = [
  { key: "ranking", title: "Classement" },
  { key: "upcoming", title: "À Venir" },
  { key: "finished", title: "Terminés" },
  { key: "map", title: "Carte" },
] as const;

const PoolTabs: React.FC<PoolTabsProps> = ({ enrichedPool }) => {
  const { isPro } = usePurchases();

  const scrollYs = useRef<Record<string, Animated.Value>>({
    ranking: new Animated.Value(0),
    upcoming: new Animated.Value(0),
    finished: new Animated.Value(0),
    map: new Animated.Value(0),
  }).current;

  const tabs = useMemo(
    () =>
      POOL_TABS.map((tab) => ({
        ...tab,
        render: () => {
          if (tab.key === "ranking") {
            return <RankingTab pool={enrichedPool} />;
          }
          if (tab.key === "map") {
            return isPro ? (
              <PoolMapTab enrichedPool={enrichedPool} />
            ) : (
              <ProUpsellTab subtitle="Accède à la carte géographique des équipes de la poule avec Blockout Pro." />
            );
          }
          return (
            <MatchList
              poolIds={[enrichedPool.id]}
              status={
                tab.key === "upcoming"
                  ? MatchStatusEnum.UPCOMING
                  : MatchStatusEnum.FINISHED
              }
              scrollY={scrollYs[tab.key]}
              headerOffset={layout.tabs}
              contentContainerStyle={[{ paddingHorizontal: 4 }]}
              showPoolHeader={false}
            />
          );
        },
      })),
    [enrichedPool, isPro, scrollYs],
  );

  return <EntityTabView tabs={tabs} scrollYs={scrollYs} />;
};

export default PoolTabs;
