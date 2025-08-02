import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useEnrichedTeamById } from '@/src/hooks/team/useEnrichedTeamById';
import TeamSkeleton from '@/src/components/team/components/TeamSkeleton';
import TeamProfile from '@/src/components/team/components/TeamProfile';
import TeamTabs from '@/src/components/team/components/TeamTabs';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HEIGHT } from '@/src/theme/globals';


const TeamScreen: React.FC = () => {
    const { team_id } = useLocalSearchParams();
    const teamId = Number(team_id);
    const { data: team, isLoading } = useEnrichedTeamById(teamId);
    const insets = useSafeAreaInsets();

    return (
        <View style={[ styles.container ]}>
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