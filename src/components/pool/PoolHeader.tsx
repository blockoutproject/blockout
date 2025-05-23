import { usePoolById } from "@/src/hooks/pool/usePoolById";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import FastImage from 'react-native-fast-image';
import { useAppTheme } from "@/src/context/ThemeProvider";

const PoolHeader: React.FC = () => {
    const { poolId } = useLocalSearchParams();
    const poolIdNumber = Number(poolId);
    const { data: pool } = usePoolById(poolIdNumber);
    const theme = useAppTheme();

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Bouton Back */}
            <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={30} color={theme.text} />
            </TouchableOpacity>

            {/* Titre + Logo */}
            <View style={styles.titleWrapper}>
                <FastImage
                    source={require("@/assets/leagues/msl.png")}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text
                    style={[styles.title, { color: theme.text }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {pool ? pool.name : "Chargement..."}
                </Text>
            </View>
        </View>
    );
};

export default PoolHeader;

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        paddingHorizontal: 12,
        paddingVertical: 15,
        alignItems: 'center',
    },
    titleWrapper: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginHorizontal: 12,
    },
    logo: {
        width: 25,
        height: 25,
        marginRight: 8,
        borderRadius: 5,
    },
    title: {
        fontSize: 14,
        fontWeight: "700",
        flexShrink: 1,
    },
});