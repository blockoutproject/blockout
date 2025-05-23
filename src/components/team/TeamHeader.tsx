import { useTeamById } from "@/src/hooks/team/useTeamById";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Text, StyleSheet, TouchableOpacity, View } from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";

const TeamHeader: React.FC = () => {
    const { teamId } = useLocalSearchParams();
    const teamIdNumber = Number(teamId);
    const { data: team } = useTeamById(teamIdNumber);
    const theme = useAppTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Bouton Back */}
            <TouchableOpacity onPress={() => router.back()}>
                <Ionicons
                    name="arrow-back"
                    size={25}
                    color={theme.text}
                />
            </TouchableOpacity>

            {/* Nom de l'équipe */}
            <Text
                style={[styles.teamName, { color: theme.text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
                adjustsFontSizeToFit
                minimumFontScale={0.8}
            >
                {team?.shortName || "Chargement..."}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 15,
    },
    teamName: {
        fontSize: 18,
        fontWeight: "600",
        marginHorizontal: 12,
        flexShrink: 1,
    },
});

export default TeamHeader;