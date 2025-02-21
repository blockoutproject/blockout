import { colors } from "@/constants/Colors";
import { Text, View } from "react-native";
const PlaceholderScreen1 = () => (
    <View
        style={{
            width: "100%",
            height: "100%",
            backgroundColor: colors.dark,
            alignItems: "center",
            justifyContent: "center",
        }}
    >
        <Text style={{ color: colors.light }}>List des matchs à venir</Text>
    </View>
);
const PlaceholderScreen2 = () => (
    <View
        style={{
            width: "100%",
            height: "100%",
            backgroundColor: colors.dark,
            alignItems: "center",
            justifyContent: "center",
        }}
    >
        <Text style={{ color: colors.light }}>Zone de recherche de matchs</Text>
    </View>
);
export default { PlaceholderScreen1, PlaceholderScreen2 };