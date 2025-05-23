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
import { useAppTheme } from '@/src/context/ThemeProvider';
import { Team } from '@/src/types/Team';
import { splitIsoDateFormatted } from '@/src/utils/utils';
import GradientView from '../common/GradientView';

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
    const theme = useAppTheme();
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
                minimumFontScale={0.8}
                style={[styles.teamName, { color: theme.text }]}
            >
                {team.name}
            </Text>
            <Text style={[styles.teamRole, { color: theme.textInactive }]}>{role}</Text>
        </Pressable>
    );

    return (
        <GradientView
            style={[styles.cardContainer, { backgroundColor: theme.background }]}
        >
            <View style={styles.verticalContent}>
                {/* Titre en haut */}
                <Text style={[styles.leagueName, { color: theme.text }]}>{leagueName}</Text>

                {/* Bloc horizontal principal */}
                <View style={styles.rowContent}>
                    <TeamBlock team={homeTeam} logo={home} role="Home" />

                    <View style={styles.centerFlow}>
                        {finalScore ? (
                            <>
                                <View style={[styles.scoreBox, { borderColor: theme.success, backgroundColor: theme.background }]}>
                                    <Text style={[styles.scoreText, { color: theme.text }]}>{finalScore}</Text>
                                </View>
                                {time && <Text style={[styles.matchTime, { color: theme.textInactive }]}>{time}</Text>}
                            </>
                        ) : (
                            <>
                                {time && <Text style={[styles.largeTime, { color: theme.text }]}>{time}</Text>}
                                <Text style={[styles.upcoming, { color: theme.textInactive }]}>À venir</Text>
                            </>
                        )}
                    </View>

                    <TeamBlock team={awayTeam} logo={away} role="Away" />
                </View>

                {/* Date en bas */}
                {date && <Text style={[styles.matchDate, { color: theme.text }]}>{date}</Text>}
            </View>
        </GradientView>
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
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    teamRole: {
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
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    scoreText: {
        fontSize: 30,
        fontWeight: '700',
    },
    matchTime: {
        fontSize: 13,
        fontWeight: '600',
    },
    upcoming: {
        fontSize: 13,
        fontWeight: '600',
    },
    matchDate: {
        fontWeight: '700',
        fontSize: 14,
    },
    leagueName: {
        fontWeight: '600',
        fontSize: 16,
    },
    largeTime: {
        fontSize: 36,
        fontWeight: '700',
    },
});

export default MatchScoreCard;