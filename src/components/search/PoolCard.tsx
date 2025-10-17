import React from "react";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { PoolSearchDoc } from "@/src/types/docs/PoolSearchDoc";
import SearchCard from "./SearchCard";

export type PoolCardProps = {
    pool: PoolSearchDoc;
    onPress: () => void;
};

const PoolCard: React.FC<PoolCardProps> = ({ pool, onPress }) => {
    const theme = useAppTheme();
    const isRegional = !["ABCCS", "AALNV"].includes(pool.leagueCode);

    return (
        <SearchCard
            title={pool.name}
            imageUri={pool.logoUrl}
            chips={[
                ...(isRegional
                    ? [{ label: pool.leagueName, labelStyle: { fontSize: 12, color: theme.textSecondary } }]
                    : []),
                { label: pool.season, labelStyle: { fontSize: 12, color: theme.textSecondary } },
            ]}
            onPress={onPress}
            testID="pool-card"
            marginBottom={12}
        />
    );
};

export default PoolCard;