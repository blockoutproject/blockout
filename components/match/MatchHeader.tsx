import { useMatchById } from "@/hooks/match/useMatchById";
import { usePoolById } from "@/hooks/pool/usePoolById";
import { usePoolsByIds } from "@/hooks/pool/usePoolsByIds";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { TouchableOpacity, View, Image, Text } from "react-native";

export function MatchHeader() {
    console.log("MatchHeader", useLocalSearchParams());
    const { match_id } = useLocalSearchParams(); // ne lit QUE les params de l'écran "match"
    const matchId = Number(match_id);
    console.log("matchId", matchId);
    const { match } = useMatchById(matchId);
    console.log("match pool_id", match?.pool_id);
    const { data: pool } = usePoolById(match?.pool_id);

    const handlePoolPress = (poolId: number) => {
        router.push(`/pool/${poolId}`);
    };

    return (
        <View
            style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "#111",
                paddingHorizontal: 12,
                paddingVertical: 15,
            }}
        >
            {/* Bouton Back */}
            <TouchableOpacity onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={30} color="#fff" />
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
                    <Image
                        source={require("../../assets/leagues/msl.png")}
                        style={{ width: 28, height: 28, marginRight: 8, borderRadius: 5 }}
                        resizeMode="contain"
                    />
                    <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>
                        {pool ? pool.pool_name : "Chargement..."}
                    </Text>
                </View>
            </TouchableOpacity>


            {/* Bouton Share */}
            <TouchableOpacity onPress={() => console.log("Share pressed!")}>
                <Ionicons name="share-outline" size={30} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}