import React, { useMemo } from "react";
import { Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import GenericTabView from "@/src/components/common/GenericTabView";
import MatchList from "@/src/components/matchList/MatchListContainer";
import RankingTab from "@/src/components/ranking/RankingTab";

import { MatchStatus } from "@/src/types/Match";
import { EnrichedPoolDTO } from "@/src/types/Pool";
import { BOTTOM_TABBAR_HEIGHT, TABBAR_HEIGHT } from "@/src/theme/globals";

/** Tabs for pool: Ranking / Upcoming / Finished. */
export type PoolTabsProps = {
    /** Enriched pool entity. */
    enrichedPool: EnrichedPoolDTO;
};

const PoolTabs: React.FC<PoolTabsProps> = ({ enrichedPool }) => {
    const insets = useSafeAreaInsets();

    const tabs = useMemo(
        () => [
            { key: "ranking", title: "Classement" },
            { key: "upcoming", title: "À Venir" },
            { key: "finished", title: "Terminés" },
        ],
        []
    );

    const scrollYs = useMemo(() => {
        return Object.fromEntries(tabs.map((tab) => [tab.key, new Animated.Value(0)]));
    }, [tabs]);

    const ranking = useMemo(
        () => (
            <RankingTab
                enrichedPool={enrichedPool}
            />
        ),
        [enrichedPool]
    );

    const finished = useMemo(
        () => (
            <MatchList
                poolIds={[enrichedPool.id]}
                status={MatchStatus.FINISHED}
                scrollY={scrollYs["finished"]}
                headerOffset={TABBAR_HEIGHT}
                contentContainerStyle={[
                    {
                        paddingHorizontal: 4,
                        marginTop: TABBAR_HEIGHT + 4,
                    },
                ]}
                showPoolHeader={false}
            />
        ),
        [enrichedPool.id, insets.bottom, scrollYs]
    );

    const upcoming = useMemo(
        () => (
            <MatchList
                poolIds={[enrichedPool.id]}
                status={MatchStatus.UPCOMING}
                scrollY={scrollYs["upcoming"]}
                headerOffset={TABBAR_HEIGHT}
                contentContainerStyle={[
                    {
                        paddingHorizontal: 4,
                        marginTop: TABBAR_HEIGHT + 4,
                    },
                ]}
                showPoolHeader={false}
            />
        ),
        [enrichedPool.id, insets.bottom, scrollYs]
    );

    const renderTabs = useMemo(
        () =>
            tabs.map((tab) => {
                if (tab.key === "ranking") {
                    return { ...tab, render: () => ranking };
                }
                if (tab.key === "finished") {
                    return { ...tab, render: () => finished };
                }
                if (tab.key === "upcoming") {
                    return { ...tab, render: () => upcoming };
                }
                return { ...tab, render: () => null };
            }),
        [tabs, ranking, finished, upcoming]
    );

    return (
        <GenericTabView
            tabs={renderTabs}
            scrollYs={scrollYs}
        />
    );
};

export default PoolTabs;