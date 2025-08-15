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
};

const SearchHeader: React.FC<SearchHeaderProps> = ({ onCloseSheet, filters, setFilters }) => {
    const theme = useAppTheme();
    const { handleBack, canGoBack } = useBackOrClose(onCloseSheet);

    return (
        <View style={styles.container}>
            <View style={styles.topRow}>
                <TouchableOpacity onPress={handleBack}>
                    {/* flèche si on peut revenir, sinon croix */}
                    {canGoBack ? (
                        <MaterialCommunityIcons name="chevron-left" size={30} color={theme.text} />
                    ) : (
                        <MaterialCommunityIcons name="close" size={30} color={theme.text} />
                    )}
                </TouchableOpacity>

                <Filters filters={filters} setFilters={setFilters} singleSelect requireSelection />
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
        justifyContent: "space-between",
    },
});

export default SearchHeader;