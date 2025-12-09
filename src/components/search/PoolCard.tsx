// src/components/cards/PoolCard.tsx
import React from "react";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { PoolSearchDocDTO } from "@/src/types/Pool";
import { EnumGender, GenderLabels } from "@/src/types/enums/Gender";
import { withAlpha, isRegional } from "@/src/utils/utils";
import EntityGradientCard, { EntityCardChip } from "../common/EntityGradientCard";

export type PoolCardProps = {
    pool: PoolSearchDocDTO;
    onPress: () => void;
};

const PoolCard: React.FC<PoolCardProps> = ({ pool, onPress }) => {
    const theme = useAppTheme();
    const isReg = isRegional(pool.leagueCode);

    const chips: EntityCardChip[] = [];

    if (isReg && pool.leagueName) {
        chips.push({
            label: pool.leagueName,
        });
    }

    if (pool.gender) {
        let genderColor: string;
        switch (pool.gender) {
            case "Masculin":
                genderColor = theme.male;
                break;
            case "Féminin":
                genderColor = theme.female;
                break;
            case "Mixte / Autre":
            default:
                genderColor = theme.textSecondary;
                break;
        }

        chips.push({
            label: pool.gender,
            borderColor: genderColor,
            backgroundColor: withAlpha(genderColor, 0.12),
        });
    }

    if (pool.season) {
        chips.push({
            label: pool.season,
        });
    }

    return (
        <EntityGradientCard
            title={pool.name}
            imageUri={pool.logoUrl}
            chips={chips}
            onPress={onPress}
            testID="pool-card"
            marginBottom={12}
            allowChipWrap
        />
    );
};

export default PoolCard;