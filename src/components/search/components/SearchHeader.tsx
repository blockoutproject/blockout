import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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
                <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
                    {canGoBack ? (
                        <MaterialCommunityIcons name="chevron-left" size={30} color={theme.text} />
                    ) : (
                        <MaterialCommunityIcons name="close" size={30} color={theme.text} />
                    )}
                </TouchableOpacity>

                {/* Les filtres prennent tout l'espace central et restent alignés à gauche */}
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
                    style={styles.iconBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <MaterialCommunityIcons name="flag-outline" size={22} color={theme.text} />
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
    iconBtn: { padding: 4 },
    filtersWrap: {
        flex: 1,                 // occupe tout l’espace entre les deux icônes
        marginHorizontal: 8,
        alignItems: "flex-start", // contenu aligné à gauche
        justifyContent: "center",
    },
});

export default SearchHeader;