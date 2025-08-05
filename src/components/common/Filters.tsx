import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { Filter } from "@/src/types/Filter";
import { useAppTheme } from "@/src/context/ThemeProvider";

type FiltersProps = {
    filters: Filter[];
    setFilters: (updated: Filter[]) => void;
    singleSelect?: boolean;
    requireSelection?: boolean;
};

const Filters: React.FC<FiltersProps> = ({
    filters,
    setFilters,
    singleSelect = false,
    requireSelection = false,
}) => {
    const theme = useAppTheme();

    const toggleFilter = async (index: number) => {
        const updated = [...filters];

        if (singleSelect) {
            const alreadyActive = updated[index].isActive;

            const isLastActive = updated.filter(f => f.isActive).length === 1 && alreadyActive;

            if (requireSelection && isLastActive) {
                return;
            }

            updated.forEach((f) => (f.isActive = false));
            if (!alreadyActive) {
                updated[index].isActive = true;
            }
        } else {
            updated[index].isActive = !updated[index].isActive;
        }

        setFilters(updated);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    return (
        <FlatList
            data={filters}
            keyExtractor={(item) => item.name}
            renderItem={({ item, index }) => (
                <Pressable
                    style={[
                        styles.filterItem,
                        {
                            backgroundColor: item.isActive ? theme.text : theme.background,
                            borderColor: theme.text,
                        },
                    ]}
                    onPress={() => toggleFilter(index)}
                >
                    <Text
                        style={{
                            fontSize: 14,
                            color: item.isActive ? theme.background : theme.text,
                            fontWeight: item.isActive ? "600" : "400",
                        }}
                    >
                        {item.name}
                    </Text>
                </Pressable>
            )}
            horizontal
            keyboardShouldPersistTaps="always"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
        />
    );
};

const styles = StyleSheet.create({
    filterItem: {
        borderRadius: 100,
        borderWidth: 1,
        paddingVertical: 6,
        paddingHorizontal: 14,
    },
    filterRow: {
        gap: 8,
        flexDirection: "row",
        paddingHorizontal: 8,
    },
});

export default Filters;