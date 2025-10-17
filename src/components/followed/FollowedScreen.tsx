import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { Filter } from "@/src/types/Filter";
import FollowedTeamsList from "./FollowedTeamsList";
import FollowedPoolsList from "./FollowedPoolsList";

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
        <View
            style={[
                styles.container,
                { backgroundColor: theme.background, },
            ]}
        >
            {activeFilter === "Équipes" && (
                <FollowedTeamsList
                    teamIds={teamIds}
                    headerOffset={headerOffset}
                    filters={filters}
                    setFilters={setFilters}
                />
            )}

            {activeFilter === "Poules" && (
                <FollowedPoolsList
                    poolIds={poolIds}
                    headerOffset={headerOffset}
                    filters={filters}
                    setFilters={setFilters}
                />
            )}
        </View>
    );
};

export default FollowedScreen;

const styles = StyleSheet.create({
    container: { flex: 1 },
});