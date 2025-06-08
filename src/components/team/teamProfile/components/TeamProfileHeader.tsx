import React from 'react';
import { View, Text } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FastImage from 'react-native-fast-image';
import TeamStatsCard from '../../TeamStatsCard';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { Team } from '@/src/types/Team';
import teamProfileStyles from '../teamProfileStyles';

const TeamProfileHeader: React.FC<{ team: Team }> = ({ team }) => {
    const theme = useAppTheme();

    return (
        <View style={teamProfileStyles.header}>
            <View style={teamProfileStyles.row}>
                <FastImage
                    source={require('@/assets/clubs/as_cannes.png')}
                    style={teamProfileStyles.logo}
                    resizeMode="contain"
                />
                <TeamStatsCard team={team} />
            </View>

            <Text style={[teamProfileStyles.title, { color: theme.text }]}>{team.name}</Text>

            <View style={teamProfileStyles.infoLine}>
                <MaterialCommunityIcons name="trophy-outline" size={18} color={theme.text} />
                <Text style={[teamProfileStyles.infoText, { color: theme.text }]}>{team.divisionName}</Text>
            </View>

            <View style={teamProfileStyles.infoLine}>
                <MaterialCommunityIcons name="gender-male-female" size={18} color={theme.text} />
                <Text style={[teamProfileStyles.infoText, { color: theme.text }]}>{team.gender}</Text>
            </View>

            <View style={teamProfileStyles.infoLine}>
                <MaterialCommunityIcons name="link-variant" size={18} color={theme.text} />
                <Text style={[teamProfileStyles.linkText, { color: theme.text }]}>as-cannes.com</Text>
            </View>
        </View>
    );
};

export default TeamProfileHeader;