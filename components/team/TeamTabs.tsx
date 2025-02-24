import React from "react";
import GenericTabView from "@/components/common/GenericTabView";
import MatchListTab from "@/components/match/MatchListTab";
import { MatchStatus } from "@/types/Match";
import { colors } from "@/constants/Colors";
import { Pool } from "@/types/Pool";
import RankingTab from "../common/RankingTab";

type TeamTabsProps = {
    pools: Pool[];
};

const TeamTabs: React.FC<TeamTabsProps> = ({ pools }) => {

    const staticTabs = [
        {
            key: "finished",
            title: "Terminé",
            render: () => <MatchListTab status={MatchStatus.FINISHED} />,
        },
        {
            key: "upcoming",
            title: "À Venir",
            render: () => <MatchListTab status={MatchStatus.UPCOMING} />,
        },
    ];

    const dynamicTabs = pools.map((pool) => ({
        key: `pool-${pool.id}`,
        title: `${pool.pool_name}`,
        render: () => <RankingTab key={pool.id} poolId={pool.id} />,
    }));

    const tabs = [...staticTabs, ...dynamicTabs];

    return (
        <GenericTabView
            tabs={tabs}
            indicatorColor={colors.green}
        />
    );
};

export default TeamTabs;