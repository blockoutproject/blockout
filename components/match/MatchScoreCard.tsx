
import { Team } from '@/types/Team';
import { useRouter } from 'expo-router';
import React from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';

type ScoreCardProps = {
    homeTeam: Team,
    awayTeam: Team,
    finalScore: string;
};

const MatchScoreCard: React.FC<ScoreCardProps> = ({
    homeTeam,
    awayTeam,
    finalScore,
}) => {

    const router = useRouter();
    const home = require("../../assets/clubs/paris_volley.png");
    const away = require("../../assets/clubs/as_cannes.png");
    type TeamProps = { team: Team; source: any };

    const handleTeamPress = (teamId: number) => {
        router.push(`/team/${teamId}`);
    };

    function Team({ team, source }: TeamProps) {
        return (
            <Pressable onPress={() => handleTeamPress(team.id)}>
                <View style={styles.teamContainer}>
                    <Image
                        source={source}
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
                            {team.name}
                        </Text>
                    </View>
                </View>
            </Pressable>
        );
    }
    return (
        <View style={styles.cardContainer}>
            {/* Équipe à domicile (gauche) */}
            <Team team={homeTeam} source={home} />

            {/* Score au centre */}
            <View style={styles.scoreBox}>
                <Text style={styles.scoreText}>{finalScore}</Text>
            </View>

            {/* Équipe à l’extérieur (droite) */}
            <Team team={awayTeam} source={away} />
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        backgroundColor: "#1C1C1E",
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
        color: "#fff",
        fontSize: 18,
        // overflow: 'hidden' n'est pas nécessaire
        // numberOfLines={1} + ellipsizeMode="tail" suffit
    },
    scoreBox: {
        borderWidth: 2,
        borderColor: "#4CAF50",
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    scoreText: {
        color: "#fff",
        fontSize: 22,
        fontWeight: 'bold',
    },
});

export default MatchScoreCard;
