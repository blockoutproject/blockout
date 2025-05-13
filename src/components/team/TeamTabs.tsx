import React from "react";
import GenericTabView from "@/src/components/common/GenericTabView";
import MatchListTab from "@/src/components/match/matchList/MatchListTab";
import { MatchStatus } from "@/src/types/Match";
import { colors } from "@/src/constants/Colors";
import { Pool } from "@/src/types/Pool";
import RankingTab from "../common/RankingTab";
import { Team } from "@/src/types/Team";

type TeamTabsProps = {
    pools: Pool[];
    team: Team;
};

const TeamTabs: React.FC<TeamTabsProps> = ({ pools, team }) => {

    const staticTabs = [
        {
            key: "finished",
            title: "Terminés",
            render: () => <MatchListTab teamIds={[team.id]} status={MatchStatus.FINISHED} />,
        },
        {
            key: "upcoming",
            title: "À Venir",
            render: () => <MatchListTab teamIds={[team.id]} status={MatchStatus.UPCOMING} />,
        },
    ];

    const dynamicTabs = pools.map((pool) => ({
        key: `pool-${pool.id}`,
        title: `${pool.name}`,
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