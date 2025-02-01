import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Match } from '@/types/Match';
import { Team } from '@/types/Team';

type MatchScoreDetailsCardProps = {
    title?: string;
    homeTeam: Team;
    awayTeam: Team;
    match: Match;
};

export default function MatchScoreDetailsCard({
    title = 'Score',
    homeTeam,
    awayTeam,
    match,
}: MatchScoreDetailsCardProps) {
    const setsArray = match.score?.split(',').map((s) => s.split('-')) || [];
    const [homeFinal, awayFinal] = match.set?.split('-') || ['0', '0'];

    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>

            {/* LIGNE ÉQUIPE HOME */}
            <View style={styles.teamRow}>
                {/* Colonne 1 : Logo */}
                <View style={styles.colLogo}>
                    <Image
                        source={require('../../assets/clubs/paris_volley.png')}
                        style={styles.teamLogo}
                        resizeMode="contain"
                    />
                </View>

                {/* Colonne 2 : Nom d’équipe (tronqué si trop long) */}
                <View style={styles.colTeamName}>
                    <Text
                        style={styles.teamName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {homeTeam.team_name}
                    </Text>
                </View>

                {/* Colonne 3 : Score final (dans un cadre) */}
                <View style={styles.colFinalScore}>
                    <View style={styles.finalScoreBox}>
                        <Text style={styles.finalScoreText}>{homeFinal}</Text>
                    </View>
                </View>

                {/* Colonnes sets : autant de colonnes que nécessaire */}
                {setsArray.map((setPair, idx) => {
                    const homeSetScore = setPair[0]; // ex: "25"
                    return (
                        <View style={styles.colSet} key={`home-set-${idx}`}>
                            <Text style={styles.setScore}>{homeSetScore}</Text>
                        </View>
                    );
                })}
            </View>

            {/* LIGNE ÉQUIPE AWAY */}
            <View style={styles.teamRow}>
                {/* Colonne 1 : Logo */}
                <View style={styles.colLogo}>
                    <Image
                        source={require('../../assets/clubs/as_cannes.png')}
                        style={styles.teamLogo}
                        resizeMode="contain"
                    />
                </View>

                {/* Colonne 2 : Nom d’équipe */}
                <View style={styles.colTeamName}>
                    <Text
                        style={styles.teamName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {awayTeam.team_name}
                    </Text>
                </View>

                {/* Colonne 3 : Score final */}
                <View style={styles.colFinalScore}>
                    <View style={styles.finalScoreBox}>
                        <Text style={styles.finalScoreText}>{awayFinal}</Text>
                    </View>
                </View>

                {/* Colonnes sets */}
                {setsArray.map((setPair, idx) => {
                    const awaySetScore = setPair[1]; // ex: "23"
                    return (
                        <View style={styles.colSet} key={`away-set-${idx}`}>
                            <Text style={styles.setScore}>{awaySetScore}</Text>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: 2,
        borderColor: '#4A4A4A',
        borderRadius: 12,
        backgroundColor: '#111',
        padding: 16,
        marginBottom: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 12,
    },
    teamRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4,
    },
    colLogo: {
        width: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
    },
    colTeamName: {
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
        marginRight: 4,
    },
    teamLogo: {
        width: 36,
        height: 36,
    },
    teamName: {
        color: '#fff',
        fontSize: 14,
    },
    finalScoreBox: {
        borderWidth: 1,
        borderColor: '#6C6C6C',
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    finalScoreText: {
        color: '#fff',
        fontSize: 16,
    },
    setScore: {
        color: '#fff',
        fontSize: 16,
    },
});