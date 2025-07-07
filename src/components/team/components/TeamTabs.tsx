import React from "react";
import GenericTabView from "@/src/components/common/GenericTabView";
import MatchList from "@/src/components/matchList/MatchListContainer";
import { MatchStatus } from "@/src/types/Match";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { Pool } from "@/src/types/Pool";
import { EnrichedTeamDTO, Team } from "@/src/types/Team";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import RankingTab from "../../common/RankingTab";
import { Division } from "@/src/types/Division";

type TeamTabsProps = {
    enrichedTeam: EnrichedTeamDTO;
};

const TeamTabs: React.FC<TeamTabsProps> = ({ enrichedTeam }) => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

    const staticTabs = [
        {
            key: "finished",
            title: "Terminés",
            render: () =>
                <MatchList
                    teamIds={[enrichedTeam.id]}
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
                    teamIds={[enrichedTeam.id]}
                    status={MatchStatus.UPCOMING}
                    contentContainerStyle={{
                        paddingHorizontal: 4,
                        marginTop: 8,
                        paddingBottom: insets.bottom + 8,
                    }}
                />,
        },
    ];

    const dynamicTabs = enrichedTeam.pools.map((enrichedPool) => ({
        key: `pool-${enrichedPool.id}`,
        title: `${enrichedPool.name}`,
        render: () => <RankingTab key={enrichedPool.id} enrichedPool={enrichedPool}/>,
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