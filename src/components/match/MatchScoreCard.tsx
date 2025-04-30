import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Pressable,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { colors } from '@/src/constants/Colors';
import { Team } from '@/src/types/Team';
import { splitIsoDateFormatted } from '@/src/utils/utils';

export interface MatchScoreCardProps {
    leagueName: string;
    homeTeam: Team;
    awayTeam: Team;
    finalScore?: string;
    matchDate: string;
}

const MatchScoreCard: React.FC<MatchScoreCardProps> = ({
    leagueName,
    homeTeam,
    awayTeam,
    finalScore,
    matchDate,
}) => {
    const router = useRouter();
    const { date, time } = splitIsoDateFormatted(matchDate);

    const onTeamPress = (id: number) => router.push(`/team/${id}`);
    const home = require('@/assets/clubs/paris_volley.png');
    const away = require('@/assets/clubs/as_cannes.png');

    const TeamBlock: React.FC<{ team: Team; logo: any; role: 'Home' | 'Away' }> = ({
        team,
        logo,
        role,
    }) => (
        <Pressable onPress={() => onTeamPress(team.id)} style={styles.teamWrapper}>
            <FastImage
                source={logo}
                style={styles.teamLogo}
                resizeMode={FastImage.resizeMode.contain}
            />
            <Text
                numberOfLines={2}
                ellipsizeMode="tail"
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                style={styles.teamName}
            >
                {team.name}
            </Text>
            <Text style={styles.teamRole}>{role}</Text>
        </Pressable>
    );

    return (
        <LinearGradient
            colors={[colors.dark, colors.grey]}
            start={{ x: 0, y: 2 }}
            end={{ x: 0, y: 0 }}
            style={styles.cardContainer}
        >
            <View style={styles.verticalContent}>
                {/* Titre en haut */}
                <Text style={styles.leagueName}>{leagueName}</Text>

                {/* Bloc horizontal principal */}
                <View style={styles.rowContent}>
                    <TeamBlock team={homeTeam} logo={home} role="Home" />

                    <View style={styles.centerFlow}>
                        {finalScore ? (
                            <>
                                <View style={styles.scoreBox}>
                                    <Text style={styles.scoreText}>{finalScore}</Text>
                                </View>
                                {time && <Text style={styles.matchTime}>{time}</Text>}
                            </>
                        ) : (
                            <>
                                {time && <Text style={styles.largeTime}>{time}</Text>}
                                <Text style={styles.upcoming}>À venir</Text>
                            </>
                        )}
                    </View>

                    <TeamBlock team={awayTeam} logo={away} role="Away" />
                </View>

                {/* Date en bas */}
                {date && <Text style={styles.matchDate}>{date}</Text>}
            </View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    cardContainer: {
        paddingVertical: 12,
        borderRadius: 16,
    },
    verticalContent: {
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 4,
    },
    rowContent: {
        flexDirection: 'row',
    },
    teamWrapper: {
        flex: 1,
        marginHorizontal: 12,
        alignItems: 'center',
    },
    teamLogo: {
        width: 90,
        height: 90,
        marginBottom: 4,
    },
    teamName: {
        color: colors.light,
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    teamRole: {
        color: colors.inactive,
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    centerFlow: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    scoreBox: {
        borderWidth: 3,
        borderColor: colors.green,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: colors.dark,
    },
    scoreText: {
        color: colors.light,
        fontSize: 30,
        fontWeight: '700',
    },
    matchTime: {
        color: colors.inactive,
        fontSize: 13,
        fontWeight: '600',
    },
    upcoming: {
        color: colors.inactive,
        fontSize: 13,
        fontWeight: '600',
    },
    matchDate: {
        fontWeight: '700',
        color: colors.active,
        fontSize: 14,
    },
    leagueName: {
        fontWeight: '600',
        color: colors.active,
        fontSize: 16,
    },
    largeTime: {
        color: colors.light,
        fontSize: 36,
        fontWeight: '700',
    },
});

export default MatchScoreCard;