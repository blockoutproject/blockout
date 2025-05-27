import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Match } from '@/src/types/Match';
import { Team } from '@/src/types/Team';
import FastImage from 'react-native-fast-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/src/context/ThemeProvider';
import GradientView from '../common/GradientView';

type MatchScoreDetailsCardProps = {
    title?: string;
    homeTeam: Team;
    awayTeam: Team;
    match: Match;
};

const MatchScoreDetailsCard: React.FC<MatchScoreDetailsCardProps> = ({
    title = 'Score',
    homeTeam,
    awayTeam,
    match,
}) => {
    const theme = useAppTheme();
    const setsArray = match.score?.split(',').map((s) => s.split('-')) || [];
    const [homeFinal, awayFinal] = match.set?.split('-') || ['0', '0'];

    const homeSets = setsArray.map((set) => parseInt(set[0], 10));
    const awaySets = setsArray.map((set) => parseInt(set[1], 10));

    const TeamRow: React.FC<TeamRowProps> = ({ team, finalScore, sets, opponentSets, logo }) => {
        return (
            <View style={styles.teamRow}>
                <View style={styles.colLogo}>
                    <FastImage
                        source={logo}
                        style={styles.teamLogo}
                        resizeMode="contain"
                    />
                </View>
                <View style={styles.colName}>
                    <Text
                        style={[styles.name, { color: theme.text }]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                    >
                        {team.shortName}
                    </Text>
                </View>
                <View style={styles.colFinalScore}>
                    <View style={[styles.finalScoreBox, { borderColor: theme.textInactive }]}>
                        <Text style={[styles.finalScoreText, { color: theme.text }]}>{finalScore}</Text>
                    </View>
                </View>
                {sets.map((setScore, idx) => {
                    const isWinner = setScore > opponentSets[idx];
                    return (
                        <View style={styles.colSet} key={`set-${idx}`}>
                            <Text style={[styles.setScore, { color: theme.textInactive }, isWinner && { color: theme.text }]}>
                                {setScore}
                            </Text>
                        </View>
                    );
                })}
            </View>
        );
    };

    return (
        <GradientView style={[styles.container]}>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

            <View style={styles.teamsWrapper}>
                <TeamRow
                    team={homeTeam}
                    finalScore={homeFinal}
                    sets={homeSets}
                    opponentSets={awaySets}
                    logo={require('@/assets/clubs/paris_volley.png')}
                />
                <TeamRow
                    team={awayTeam}
                    finalScore={awayFinal}
                    sets={awaySets}
                    opponentSets={homeSets}
                    logo={require('@/assets/clubs/as_cannes.png')}
                />
            </View>
        </GradientView>
    );
};

type TeamRowProps = {
    team: Team;
    finalScore: string;
    sets: number[];
    opponentSets: number[];
    logo: any;
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    teamsWrapper: {
        flexDirection: 'column',
        gap: 10,
    },
    teamRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    colLogo: {
        width: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
    },
    colName: {
        flex: 1,
        marginRight: 4,
    },
    colFinalScore: {
        width: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
    },
    colSet: {
        width: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    teamLogo: {
        width: 36,
        height: 36,
    },
    name: {
        fontWeight: '600',
        fontSize: 14,
    },
    finalScoreBox: {
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    finalScoreText: {
        fontSize: 14,
        fontWeight: '600',
    },
    setScore: {
        fontSize: 14,
    },
});

export default MatchScoreDetailsCard;