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

    return (
        <SearchCard
            title={pool.name}
            imageUri={pool.logoUrl}
            fallbackImage={require("@/assets/clubs/default_club_logo.png")}
            chips={[
                { label: pool.divisionName, labelStyle: { fontSize: 11, color: theme.textSecondary } },
                { label: pool.leagueName, labelStyle: { fontSize: 11, color: theme.textSecondary }, maxWidth: 140 },
                { label: pool.season, labelStyle: { fontSize: 11, color: theme.textSecondary } },
            ]}
            onPress={onPress}
            testID="pool-card"
            contentFit="contain"
            marginBottom={12}
        />
    );
};

export default PoolCard;