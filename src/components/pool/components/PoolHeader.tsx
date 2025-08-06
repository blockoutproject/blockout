import { useAppTheme } from "@/src/context/ThemeProvider";
import { HEADER_HEIGHT } from "@/src/theme/globals";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { SheetStackParamList } from "../../common/BottomSheetNavigator";

type PoolHeaderProps = {
    onCloseSheet: () => void;
};

const PoolHeader: React.FC<PoolHeaderProps> = ({ onCloseSheet }) => {
    const theme = useAppTheme();
    const navigation = useNavigation<NativeStackNavigationProp<SheetStackParamList>>();

    return (
        <View style={[
            styles.container
        ]}>
            <View style={styles.header}>
                {/* Bouton Back */}
                <TouchableOpacity
                    onPress={() => {
                        navigation.canGoBack() ? navigation.goBack() : onCloseSheet();
                    }}>
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
        height: HEADER_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
    },
});

export default PoolHeader;