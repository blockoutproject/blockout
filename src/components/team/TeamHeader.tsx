import { colors } from "@/src/constants/Colors";
import { useTeamById } from "@/src/hooks/team/useTeamById";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Text, StyleSheet, TouchableOpacity, View } from "react-native";

const TeamHeader: React.FC = () => {
    const { team_id } = useLocalSearchParams();
    const teamId = Number(team_id);
    const { data: team } = useTeamById(teamId);

    return (
        <View style={styles.container}>
            {/* Bouton Back */}
            <TouchableOpacity onPress={() => router.back()}>
                <Ionicons
                    name="arrow-back"
                    size={25}
                    color={colors.light}
                />
            </TouchableOpacity>

            {/* Nom de l'équipe */}
            <Text
                style={styles.teamName}
                numberOfLines={1}
                ellipsizeMode="tail"
                adjustsFontSizeToFit
                minimumFontScale={0.8}
            >
                {team?.short_name || "Chargement..."}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.dark,
        paddingHorizontal: 12,
        paddingVertical: 15,
    },
    teamName: {
        color: colors.light,
        fontSize: 18,
        fontWeight: "600",
        marginHorizontal: 12,
        flexShrink: 1,
    },
});

export default TeamHeader;