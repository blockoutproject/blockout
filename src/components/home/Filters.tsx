import { colors } from "@/src/constants/Colors";
import { Filter } from "@/src/types/Filter";
import React from "react";
import {
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import * as Haptics from "expo-haptics";

type FiltersProps = {
    filters: Filter[];
    setFilters: (updatedFilters: Filter[]) => void;
};

const Filters: React.FC<FiltersProps> = ({ filters, setFilters }) => {

    const toggleFilter = async (index: number) => {
        // On copie puis on toggle l’état du filtre
        const updated = [...filters];
        updated[index] = {
            ...updated[index],
            isActive: !updated[index].isActive,
        };
        setFilters(updated);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    type ItemProps = {
        filter: Filter;
        index: number;
    };

    function FilterItem({ filter, index }: ItemProps) {
        return (
            <Pressable
                style={[
                    styles.filterItem,
                    {
                        backgroundColor: filter.isActive ? colors.light : colors.dark,
                    },
                ]}
                onPress={async () => toggleFilter(index)}
            >
                <Text
                    style={{
                        fontSize: 16,
                        color: filter.isActive ? colors.dark : colors.light,
                        fontWeight: filter.isActive ? "600" : "400",
                    }}
                >
                    {filter.name}
                </Text>
            </Pressable>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={filters}
                keyExtractor={(item) => item.name}
                renderItem={({ item, index }) => (
                    <FilterItem filter={item} index={index} />
                )}
                contentContainerStyle={{
                    gap: 6,
                    flexDirection: "row",
                    paddingHorizontal: 16,

                }}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
            />
        </View>
    );
};

export default Filters;

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.dark,
        alignItems: "center",
        justifyContent: "center",
        borderColor: colors.green,
    },
    filterItem: {
        alignSelf: "flex-start",
        borderColor: colors.light,
        borderRadius: 100,
        borderWidth: 1,
        paddingVertical: 3,
        paddingHorizontal: 15,
    },
});