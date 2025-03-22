import { colors } from "@/src/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, StyleSheet, TouchableOpacity, View } from "react-native";
import { style } from "twrnc";

const TeamHeader: React.FC = () => {
    return (
        <View
            style={styles.container}
        >
            {/* Bouton Back */}
            <View
                style={{
                    position: "absolute",
                    left: 12,
                }}
            >
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons
                        name="arrow-back"
                        size={25}
                        color={colors.light}
                    />
                </TouchableOpacity>
            </View>
            <Text
                style={{
                    color: colors.light,
                    fontSize: 18,
                    fontWeight: "600",
                }}
            >
                AS Cannes - N2F
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.dark,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 15,
        justifyContent: "center",
    },
});

export default TeamHeader;