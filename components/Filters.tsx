import { colors } from "@/constants/colors";

import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";

type Filter = {
    name: string;
    isActive: boolean;
    // targetedField: string;
    // check function
};

const filters: Filter[] = [
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
];

type ItemProps = { filter: Filter };
const FilterItem = ({ filter }: ItemProps) => (
    <View
        style={{
            ...styles.filterItem,
            backgroundColor: filter.isActive ? colors.light : colors.dark,
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
    </View>
);

function Filters() {
    return (
        <View
            style={{
                backgroundColor: colors.dark,
                // height: 60,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
            }}
        >
            <FlatList
                data={filters}
                keyExtractor={(item: Filter) => item.name}
                renderItem={({ item }) => <FilterItem filter={item} />}
                contentContainerStyle={{ gap: 6, flexDirection: "row" }}
            />
        </View>
    );
}

export default Filters;

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
