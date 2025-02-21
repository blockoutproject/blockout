import React from "react";
import { View } from "react-native";
import GenericTabView from "@/components/common/GenericTabView";
import MatchListTab from "@/components/match/MatchListTab";
import { MatchStatus } from "@/types/Match";
import { colors } from "@/constants/Colors";
import RankingCard from "../common/RankingCard";
import { CompetitionAssociation } from "@/types/Competition";

type TeamTabsProps = {
    pools: CompetitionAssociation[];
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
        title: `Classement ${pool.id}`,
        render: () => (
            <View style={{ flex: 1 }}>
                <RankingCard key={pool.id} poolId={pool.id!} />
            </View>
        ),
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