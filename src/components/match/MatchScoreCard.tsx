
import { colors } from '@/src/constants/Colors';
import { Team } from '@/src/types/Team';
import { useRouter } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import FastImage from 'react-native-fast-image'

type ScoreCardProps = {
    homeTeam: Team,
    awayTeam: Team,
    finalScore: string;
};

const MatchScoreCard: React.FC<ScoreCardProps> = ({
    homeTeam,
    awayTeam,
    finalScore
}) => {

    const router = useRouter();
    const home = require("@/assets/clubs/paris_volley.png");
    const away = require("@/assets/clubs/as_cannes.png");
    type TeamProps = { team: Team; source: any };

    const handleTeamPress = (teamId: number) => {
        router.push(`/team/${teamId}`);
    };

    function Team({ team, source }: TeamProps) {
        return (
            <Pressable onPress={() => handleTeamPress(team.id)}>
                <View style={styles.teamContainer}>
                    <FastImage
                        source={source}
                        style={styles.teamLogo}
                        resizeMode="contain"
                    />
                    {/* Contrainte de maxWidth pour forcer le tronquage */}
                    <View>
                        <Text
                            style={styles.name}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                            adjustsFontSizeToFit
                            minimumFontScale={0.8} // par exemple, le texte ne sera pas réduit en dessous de 70% de sa taille d'origine
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
            <View style={{ flex: 1 }}>
                <Team team={homeTeam} source={home} />
            </View>
            {/* Score au centre */}
            <View style={styles.scoreBox}>
                <Text style={styles.scoreText}>{finalScore}</Text>
            </View>

            {/* Équipe à l’extérieur (droite) */}
            <View style={{ flex: 1 }}>
                <Team team={awayTeam} source={away} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-around",
        backgroundColor: colors.grey,
        borderRadius: 12,
        marginBottom: 16,
    },
    teamContainer: {
        padding: 12,
        alignItems: 'center',
    },
    teamLogo: {
        width: 70,
        height: 70,
        marginBottom: 8,
    },
    name: {
        color: colors.light,
        fontSize: 16,
    },
    scoreBox: {
        borderWidth: 2,
        borderColor: colors.green,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: colors.dark,
    },
    scoreText: {
        color: colors.light,
        fontSize: 22,
        fontWeight: 'bold',
    },
});

export default MatchScoreCard;
