import React from "react";
import GenericTabView from "@/src/components/common/GenericTabView";
import MatchList from "@/src/components/matchList/MatchListContainer";
import { MatchStatus } from "@/src/types/Match";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { Pool } from "@/src/types/Pool";
import { Team } from "@/src/types/Team";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RankingTab from "../../common/RankingTab";

type TeamTabsProps = {
    pools: Pool[];
    team: Team;
};

const TeamTabs: React.FC<TeamTabsProps> = ({ pools, team }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

    const staticTabs = [
        {
            key: "finished",
            title: "Terminés",
            render: () =>
                <MatchList
                    teamIds={[team.id]}
                    status={MatchStatus.FINISHED}
                    contentContainerStyle={{
                        paddingHorizontal: 4,
                        marginTop: 8,
                        paddingBottom: insets.bottom + 8,
                    }}
                />,
        },
        {
            key: "upcoming",
            title: "À Venir",
            render: () =>
                <MatchList
                    teamIds={[team.id]}
                    status={MatchStatus.UPCOMING}
                    contentContainerStyle={{
                        paddingHorizontal: 4,
                        marginTop: 8,
                        paddingBottom: insets.bottom + 8,
                    }}
                />,
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
            indicatorColor={theme.success}
        />
    );
};

export default TeamTabs;