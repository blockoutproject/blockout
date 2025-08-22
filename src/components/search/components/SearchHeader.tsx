import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import { useAppTheme } from "@/src/context/ThemeProvider";
import { HEADER_HEIGHT } from "@/src/theme/globals";
import Filters from "@/src/components/common/Filters";
import { useBackOrClose } from "@/src/hooks/utils/useBackOrClose";
import { Filter } from "@/src/types/Filter";

type SearchHeaderProps = {
    onCloseSheet: () => void;
    filters: Filter[];
    setFilters: (updated: Filter[]) => void;
    onOpenReport: () => void;
};

const SearchHeader: React.FC<SearchHeaderProps> = ({ onCloseSheet, filters, setFilters, onOpenReport }) => {
    const theme = useAppTheme();
    const { handleBack, canGoBack } = useBackOrClose(onCloseSheet);

    return (
        <View style={styles.container}>
            <View style={styles.topRow}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <Ionicons name={canGoBack ? "chevron-back-outline" : "close"} size={canGoBack ? 30 : 35} color={theme.text} />
                </TouchableOpacity>

                <View style={styles.filtersWrap}>
                    <Filters
                        filters={filters}
                        setFilters={setFilters}
                        singleSelect
                        requireSelection
                        size="sm"
                        scrollable={false}
                        containerStyle={{ paddingHorizontal: 0 }}
                    />
                </View>

                <TouchableOpacity
                    onPress={onOpenReport}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <MaterialCommunityIcons name="flag-outline" size={28} color={theme.text} />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { paddingHorizontal: 12 },
    topRow: {
        height: HEADER_HEIGHT,
        flexDirection: "row",
        alignItems: "center",
    },
    backButton: { marginRight: 4 },
    filtersWrap: {
        flex: 1,                 // occupe tout l’espace entre les deux icônes
        marginHorizontal: 8,
        alignItems: "flex-start", // contenu aligné à gauche
        justifyContent: "center",
    },
});

export default SearchHeader;