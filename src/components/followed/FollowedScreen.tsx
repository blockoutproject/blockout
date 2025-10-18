import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { Filter } from "@/src/types/Filter";
import FollowedTeamsList from "./FollowedTeamsList";
import FollowedPoolsList from "./FollowedPoolsList";
import FollowedListHeader from "./FollowedListHeader";

export type FollowedScreenListProps = {
    poolIds?: number[];
    teamIds?: number[];
    headerOffset: number;
};

const FollowedScreen: React.FC<FollowedScreenListProps> = ({
    poolIds,
    teamIds,
    headerOffset,
}) => {
    const theme = useAppTheme();

    const [filters, setFilters] = useState<Filter[]>([
        { name: "Équipes", isActive: true },
        { name: "Poules", isActive: false },
    ]);

    const activeFilter = useMemo(
        () => filters.find((f) => f.isActive)?.name,
        [filters]
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header rendu ICI (parent) */}
            <FollowedListHeader
                filters={filters}
                setFilters={setFilters}
                headerOffset={headerOffset}
            />

            {/* Liste selon le filtre actif (sans header interne) */}
            {activeFilter === "Équipes" ? (
                <FollowedTeamsList teamIds={teamIds} headerOffset={headerOffset} />
            ) : (
                <FollowedPoolsList poolIds={poolIds} headerOffset={headerOffset} />
            )}
        </View>
    );
};

export default FollowedScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
});