import { Text, View } from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";

const PlaceholderScreen1 = () => {
    const theme = useAppTheme();

    return (
        <View
            style={{
                width: "100%",
                height: "100%",
                backgroundColor: theme.background,
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Text style={{ color: theme.text }}>List des matchs à venir</Text>
        </View>
    );
};

const PlaceholderScreen2 = () => {
    const theme = useAppTheme();

    return (
        <View
            style={{
                width: "100%",
                height: "100%",
                backgroundColor: theme.background,
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <Text style={{ color: theme.text }}>Zone de recherche de matchs</Text>
        </View>
    );
};

export default { PlaceholderScreen1, PlaceholderScreen2 };