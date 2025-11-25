import React from "react";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { PoolSearchDocDTO } from "@/src/types/Pool";
import SearchCard from "./SearchCard";
import { isRegional } from "@/src/utils/utils";

export type PoolCardProps = {
    pool: PoolSearchDocDTO;
    onPress: () => void;
};

const PoolCard: React.FC<PoolCardProps> = ({ pool, onPress }) => {
    const theme = useAppTheme();
    const isReg = isRegional(pool.leagueCode);

    return (
        <SearchCard
            title={pool.name}
            imageUri={pool.logoUrl}
            chips={[
                ...(isReg
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