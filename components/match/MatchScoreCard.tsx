
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

type ScoreCardProps = {
    homeTeamName: string;
    homeTeamLogo: string;
    awayTeamName: string;
    awayTeamLogo: string;
    finalScore: string; // ex. "2-0"
};

export default function MatchScoreCard({
    homeTeamName,
    homeTeamLogo,
    awayTeamName,
    awayTeamLogo,
    finalScore,
}: ScoreCardProps) {
    return (
        <View style={styles.cardContainer}>
            {/* Équipe à domicile (gauche) */}
            <View style={styles.teamContainer}>
                <Image
                    source={require('../../assets/clubs/paris_volley.png')}
                    style={styles.teamLogo}
                    resizeMode="contain"
                />

                {/* Contrainte de maxWidth pour forcer le tronquage */}
                <View style={styles.teamNameContainer}>
                    <Text
                        style={styles.teamName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {homeTeamName}
                    </Text>
                </View>
            </View>

            {/* Score au centre */}
            <View style={styles.scoreBox}>
                <Text style={styles.scoreText}>{finalScore}</Text>
            </View>

            {/* Équipe à l’extérieur (droite) */}
            <View style={styles.teamContainer}>
                <Image
                    source={require('../../assets/clubs/as_cannes.png')}
                    style={styles.teamLogo}
                    resizeMode="contain"
                />

                <View style={styles.teamNameContainer}>
                    <Text
                        style={styles.teamName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {awayTeamName}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: '#1f1f1f',
        paddingHorizontal: 16,
        paddingVertical: 20,
        borderRadius: 12,
        marginBottom: 16,
    },
    teamContainer: {
        alignItems: 'center',
    },
    teamLogo: {
        width: 70,
        height: 70,
        marginBottom: 10,
    },
    // Conteneur avec largeur ou maxWidth pour tronquer
    teamNameContainer: {
        maxWidth: 110,  // Ajustez selon votre design
    },
    teamName: {
        color: '#fff',
        fontSize: 14,
        // overflow: 'hidden' n'est pas nécessaire
        // numberOfLines={1} + ellipsizeMode="tail" suffit
    },
    scoreBox: {
        borderWidth: 2,
        borderColor: '#4CAF50',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    scoreText: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
    },
});
