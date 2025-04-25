import { colors } from "@/src/constants/Colors";
import { usePoolById } from "@/src/hooks/pool/usePoolById";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import FastImage from 'react-native-fast-image'

const PoolHeader: React.FC = () =>{
    const { pool_id } = useLocalSearchParams();
    const poolId = Number(pool_id);
    const { data: pool } = usePoolById(poolId);

    return (
        <View
            style={styles.container}
        >
            {/* Bouton Back */}
            <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={30} color={colors.light} />
            </TouchableOpacity>

            <View
                style={{
                    flexDirection: "row",
                    alignItems: "center",
                    flex: 1,
                    marginHorizontal: 12
                }}
            >
                <FastImage
                    source={require("@/assets/leagues/msl.png")}
                    style={{ width: 28, height: 28, marginRight: 8, borderRadius: 5 }}
                    resizeMode="contain"
                />
                <Text 
                    style={styles.title}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                >
                    {pool ? pool.pool_name : "Chargement..."}
                </Text>
            </View>

            {/* Bouton Share */}
            <TouchableOpacity onPress={() => console.log("Share pressed!")}>
                <Ionicons name="share-outline" size={30} color={colors.light} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: colors.dark,
        paddingHorizontal: 12,
        paddingVertical: 15,
    },
    title: {
        fontSize: 14,
        fontWeight: "700",
        color: colors.active,
        flexShrink: 1
    },
});

export default PoolHeader;