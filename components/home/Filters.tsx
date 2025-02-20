import { colors } from "@/constants/colors";
import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
type Filter = {
    name: string;
    isActive: boolean;
};

const Filters: React.FC = () => {

    const [filters, setFilters] = useState<Filter[]>([
        {
            name: "Pro",
            isActive: true,
        },
        {
            name: "Elite",
            isActive: false,
        },
        {
            name: "N2",
            isActive: false,
        },
        {
            name: "N3",
            isActive: false,
        },
        {
            name: "Masc",
            isActive: true,
        },
        {
            name: "Fem",
            isActive: true,
        },
        {
            name: "Amateur",
            isActive: false,
        },
    ]);
    type ItemProps = {
        filter: Filter;
    };
    function FilterItem({ filter }: ItemProps) {
        let index = filters.findIndex((item) => item == filter);
        return (
            <Pressable
                style={{
                    ...styles.filterItem,
                    backgroundColor: filter.isActive
                        ? colors.light
                        : colors.dark,
                }}
                onPress={() => {
                    let updatedFilters = [...filters]; // make shallow copy
                    updatedFilters[index] = {
                        ...filters[index],
                        isActive: !filters[index].isActive,
                    };
                    setFilters(updatedFilters);
                }}
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
        <View
            style={{
                backgroundColor: colors.dark,
                alignItems: "center",
                justifyContent: "center",
                paddingLeft: 16,
            }}
        >
            <FlatList
                data={filters}
                keyExtractor={(item: Filter) => item.name}
                renderItem={({ item }) => <FilterItem filter={item} />}
                contentContainerStyle={{ gap: 6, flexDirection: "row" }}
                horizontal={true}
                showsHorizontalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    filterItem: {
        alignSelf: "flex-start",
        borderColor: colors.light,
        borderRadius: 100,
        borderWidth: 1,
        paddingVertical: 3,
        paddingHorizontal: 15,
    },
});

export default Filters;