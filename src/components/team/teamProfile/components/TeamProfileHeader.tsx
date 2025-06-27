import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import FastImage from 'react-native-fast-image';
import TeamStatsCard from './TeamStatsCard';
import { useAppTheme } from '@/src/context/ThemeProvider';
import { Team } from '@/src/types/Team';

const TeamProfileHeader: React.FC<{ team: Team }> = ({ team }) => {
    const theme = useAppTheme();

    return (
        <View style={styles.header}>
            <View style={styles.row}>
                <FastImage
                    source={require('@/assets/clubs/as_cannes.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <TeamStatsCard team={team} />
            </View>

            <Text style={[styles.title, { color: theme.text }]}>{team.name}</Text>

            <View style={styles.infoLine}>
                <MaterialCommunityIcons name="trophy-outline" size={18} color={theme.text} />
                <Text style={[styles.infoText, { color: theme.text }]}>{team.divisionCode}</Text>
            </View>

            <View style={styles.infoLine}>
                <MaterialCommunityIcons name="gender-male-female" size={18} color={theme.text} />
                <Text style={[styles.infoText, { color: theme.text }]}>{team.gender}</Text>
            </View>

            <View style={styles.infoLine}>
                <MaterialCommunityIcons name="link-variant" size={18} color={theme.text} />
                <Text style={[styles.linkText, { color: theme.text }]}>as-cannes.com</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    header: {
        marginBottom: 10,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    logo: {
        aspectRatio: 1,
        height: 110,
    },
    title: {
        fontWeight: '700',
        fontSize: 20,
        marginBottom: 10,
    },
    infoLine: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 2,
    },
    infoText: {
        fontSize: 14,
    },
    linkText: {
        fontSize: 14,
    },
});


export default TeamProfileHeader;