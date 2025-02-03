import { useMatchById } from "@/hooks/useMatchById";
import { usePoolById } from "@/hooks/usePoolById";
import { usePoolsByIds } from "@/hooks/usePoolsByIds";
import { Ionicons } from "@expo/vector-icons";
import { router, useGlobalSearchParams } from "expo-router";
import { TouchableOpacity, View, Image, Text } from "react-native";

export function MatchHeader() {
    const route = useGlobalSearchParams();
    const matchId = Number(route.id);

    // 🔥 Charger les infos du match
    const { match } = useMatchById(matchId);
    const { data: pool } = usePoolById(match?.pool_id);
    console.log("Pool", pool);  

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

            {/* 🔥 Affichage du nom de la Pool */}
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

            {/* Bouton Share */}
            <TouchableOpacity onPress={() => console.log("Share pressed!")}>
                <Ionicons name="share-outline" size={30} color="#fff" />
            </TouchableOpacity>
        </View>
    );
}