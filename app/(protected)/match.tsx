import { useMatches } from "@/hooks/useMatches";
import { useTeamsByIds } from "@/hooks/useTeamsByIds";
import MainScore from "@/modules/match/components/MainScore";
import { Match } from "../../types/Match";

import React from "react";
import {
    ActivityIndicator,
    Button,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";

export default function MatchDetailsModal() {
    const params = useLocalSearchParams();
    const router = useRouter();
    const { matches, isLoading: matchesLoading, isError, error } = useMatches();

    // Recherche du match correspondant à l'ID dans les paramètres
    const match: Match | undefined = matches?.find(
        (match) => match.id === Number(params.id)
    );

    // Récupération des équipes A et B
    const {
        teams,
        isLoading: teamsLoading,
        isError: teamsError,
    } = useTeamsByIds(match ? [match.team_id_a, match.team_id_b] : []);

    if (matchesLoading || teamsLoading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#0000ff" />
                <Text>Chargement en cours...</Text>
            </View>
        );
    }

    if (!match) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Match introuvable.</Text>
                <Button title="Retour" onPress={() => router.back()} />
            </View>
        );
    }

    if (teamsError || isError) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>
                    Une erreur est survenue lors du chargement des données.
                </Text>
                <Button title="Retour" onPress={() => router.back()} />
            </View>
        );
    }

    // Trouver les informations des équipes
    const teamA = teams?.find((team) => team.id === match.team_id_a);
    const teamB = teams?.find((team) => team.id === match.team_id_b);

    return (
        <View style={styles.container}>
            <MainScore
                teamAName="AS Cannes"
                teamBName="Paris Volley"
                teamALogo={require("@/assets/clubs/as_cannes.png")}
                teamBLogo={require("@/assets/clubs/paris_volley.png")}
                score={[2, 0]}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
    },
    errorText: {
        fontSize: 18,
        color: "red",
        marginBottom: 16,
    },
});
