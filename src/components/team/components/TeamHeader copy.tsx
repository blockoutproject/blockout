import { useAppTheme } from "@/src/context/ThemeProvider";
import { HEIGHT } from "@/src/theme/globals";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TeamHeader: React.FC = () => {
    const theme = useAppTheme();
    const insets = useSafeAreaInsets();

    return (
        <View style={[
            styles.container,
            { paddingTop: insets.top }
        ]}>
            <View style={styles.header}>
                {/* Bouton Back */}
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={30} color={theme.text} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: "transparent",
    },
    header: {
        height: HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
    },
});

export default TeamHeader;