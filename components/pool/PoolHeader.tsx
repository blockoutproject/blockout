import { usePoolById } from "@/hooks/pool/usePoolById";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { TouchableOpacity, View, Image, Text } from "react-native";

const PoolHeader: React.FC = () =>{
    const { pool_id } = useLocalSearchParams();
    const poolId = Number(pool_id);
    const { data: pool } = usePoolById(poolId);

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

export default PoolHeader;