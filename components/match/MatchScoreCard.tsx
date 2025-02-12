
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

type ScoreCardProps = {
    homeName: string;
    homeTeamLogo: string;
    awayName: string;
    awayTeamLogo: string;
    finalScore: string; // ex. "2-0"
};

export default function MatchScoreCard({
    homeName,
    homeTeamLogo,
    awayName,
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
                        style={styles.name}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {homeName}
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
                        style={styles.name}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                    >
                        {awayName}
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
        backgroundColor: '#1C1C1E',
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
    name: {
        color: '#fff',
        fontSize: 18,
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
