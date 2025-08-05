import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useEnrichedTeamById } from '@/src/hooks/team/useEnrichedTeamById';
import TeamSkeleton from '@/src/components/team/components/TeamSkeleton';
import TeamProfile from '@/src/components/team/components/TeamProfile';
import TeamTabs from '@/src/components/team/components/TeamTabs';
import { RouteProp, useRoute } from '@react-navigation/native';
import { SheetStackParamList } from '@/src/components/common/BottomSheetNavigator';

type TeamRouteProp = RouteProp<SheetStackParamList, 'Team'>;

const TeamScreen: React.FC = () => {
    const { params } = useRoute<TeamRouteProp>();
    const teamId = params.teamId;
    const { data: team, isLoading } = useEnrichedTeamById(teamId);

    return (
        <View style={[styles.container]}>
            {isLoading || !team ? (
                <TeamSkeleton />
            ) : (
                <>
                    <TeamProfile enrichedTeam={team} />
                    <TeamTabs enrichedTeam={team} />
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default TeamScreen;