import React from 'react';
import { View } from 'react-native';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { Team } from '@/src/types/Team';
import { useTeamFollowState } from '@/src/hooks/team/useTeamFollowState';
import teamProfileStyles from './teamProfileStyles';
import TeamProfileHeader from './components/TeamProfileHeader';
import TeamProfileActions from './components/TeamProfileActions';

type Props = {
    team: Team;
};

const TeamProfile: React.FC<Props> = ({ team }) => {
    const theme = useAppTheme();
    const followState = useTeamFollowState(team);

    return (
        <View style={[teamProfileStyles.container, { backgroundColor: theme.background }]}>
            <TeamProfileHeader team={team} />
            <TeamProfileActions {...followState} />
        </View>
    );
};

export default TeamProfile;