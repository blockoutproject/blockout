import React, { useMemo } from "react";
import { Animated } from "react-native";

import GenericTabView from "@/src/shared/ui/generic-tab-view";
import MatchList from "@/src/modules/match/ui/MatchList";
import RankingTab from "@/src/modules/ranking/ui/ranking-tab";
import ProUpsellTab from "@/src/modules/subscription/ui/ProUpsellTab";

import { MatchStatusEnum } from "@/src/shared/generated/models";
import type { PoolResponse } from "@/src/shared/generated/models";
import {layout} from "@/src/shared/theme";
import PoolMapTab from "./PoolMapTab";
import { usePurchases } from "@/src/modules/subscription/providers/PurchasesProvider";

/** Tabs for pool: Ranking / Upcoming / Finished / Map. */
export type PoolTabsProps = {
  /** Enriched pool entity. */
  enrichedPool: PoolResponse;
};

const PoolTabs: React.FC<PoolTabsProps> = ({ enrichedPool }) => {
  const { isPro } = usePurchases();

  const tabs = useMemo(
    () => [
      { key: "ranking", title: "Classement" },
      { key: "upcoming", title: "À Venir" },
      { key: "finished", title: "Terminés" },
      { key: "map", title: "Carte" },
    ],
    [],
  );

  const scrollYs = useMemo(() => {
    return Object.fromEntries(
      tabs.map((tab) => [tab.key, new Animated.Value(0)]),
    );
  }, [tabs]);

  const ranking = useMemo(
    () => <RankingTab pool={enrichedPool} />,
    [enrichedPool],
  );

  const finished = useMemo(
    () => (
      <MatchList
        poolIds={[enrichedPool.id]}
        status={MatchStatusEnum.FINISHED}
        scrollY={scrollYs["finished"]}
        headerOffset={layout.tabs}
        contentContainerStyle={[{ paddingHorizontal: 4 }]}
        showPoolHeader={false}
      />
    ),
    [enrichedPool.id, scrollYs],
  );

  const upcoming = useMemo(
    () => (
      <MatchList
        poolIds={[enrichedPool.id]}
        status={MatchStatusEnum.UPCOMING}
        scrollY={scrollYs["upcoming"]}
        headerOffset={layout.tabs}
        contentContainerStyle={[{ paddingHorizontal: 4 }]}
        showPoolHeader={false}
      />
    ),
    [enrichedPool.id, scrollYs],
  );

  const map = useMemo(() => {
    if (!isPro) {
      return (
        <ProUpsellTab subtitle="Accède à la carte géographique des équipes de la poule avec Blockout Pro." />
      );
    }

    return <PoolMapTab enrichedPool={enrichedPool} />;
  }, [enrichedPool, isPro]);

  const renderTabs = useMemo(
    () =>
      tabs.map((tab) => {
        if (tab.key === "ranking") return { ...tab, render: () => ranking };
        if (tab.key === "finished") return { ...tab, render: () => finished };
        if (tab.key === "upcoming") return { ...tab, render: () => upcoming };
        if (tab.key === "map") return { ...tab, render: () => map };
        return { ...tab, render: () => null };
      }),
    [tabs, ranking, finished, upcoming, map],
  );

  return <GenericTabView tabs={renderTabs} scrollYs={scrollYs} />;
};

export default PoolTabs;
