import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { HEADER_HEIGHT } from "@/src/theme/globals";
import Filters from "@/src/components/common/Filters";
import type { Filter } from "@/src/types/Filter";
import type { SheetStackParamList } from "@/src/components/common/BottomSheetNavigator";

type Props = {
    onCloseSheet: () => void;
    filters: Filter[];
    setFilters: (updated: Filter[]) => void;
};

const SearchHeader: React.FC<Props> = ({ onCloseSheet, filters, setFilters }) => {
    const theme = useAppTheme();
    const navigation = useNavigation<NativeStackNavigationProp<SheetStackParamList>>();

    return (
        <View style={styles.container}>
            <View style={styles.topRow}>
                <TouchableOpacity
                    onPress={() => {
                        navigation.canGoBack() ? navigation.goBack() : onCloseSheet();
                    }}
                >
                    <Ionicons name="arrow-back" size={30} color={theme.text} />
                </TouchableOpacity>

                <Filters filters={filters} setFilters={setFilters} singleSelect requireSelection />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 12,
    },
    topRow: {
        height: HEADER_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
});

export default SearchHeader;