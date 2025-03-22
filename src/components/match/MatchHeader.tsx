import { colors } from "@/src/constants/Colors";
import { useMatchById } from "@/src/hooks/match/useMatchById";
import { usePoolById } from "@/src/hooks/pool/usePoolById";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import FastImage from 'react-native-fast-image'

const MatchHeader: React.FC = () => {
    const { match_id } = useLocalSearchParams(); 
    const matchId = Number(match_id);
    const { match } = useMatchById(matchId);
    const { data: pool } = usePoolById(match?.pool_id);

    const handlePoolPress = (poolId: number) => {
        router.push(`/pool/${poolId}`);
    };

    return (
        <View
            style={styles.container}
        >
            {/* Bouton Back */}
            <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={30} color={colors.light} />
            </TouchableOpacity>
            <TouchableOpacity
                onPress={() => handlePoolPress(pool!.id)}
            >
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                    }}
                >
                    <FastImage
                        source={require("@/assets/leagues/msl.png")}
                        style={{ width: 28, height: 28, marginRight: 8, borderRadius: 5 }}
                        resizeMode="contain"
                    />
                    <Text style={{ color: colors.light, fontSize: 18, fontWeight: "600" }}>
                        {pool ? pool.pool_name : "Chargement..."}
                    </Text>
                </View>
            </TouchableOpacity>


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
});

export default MatchHeader;