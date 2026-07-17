// src/components/cards/FollowedPoolCard.tsx
import React from "react";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { PoolSummaryDTO } from "@/src/types/Pool";
import { EnumGender, GenderLabels } from "@/src/types/enums/Gender";
import { FormatLabels } from "@/src/types/enums/Format";
import { isRegional, withAlpha } from "@/src/utils/utils";
import EntityGradientCard, { EntityCardChip } from "../common/EntityGradientCard";

export type FollowedPoolCardProps = {
    pool: PoolSummaryDTO;
    onPress: () => void;
    testID?: string;
    logoSize?: number;
    borderRadius?: number;
    padding?: number;
    marginBottom?: number;
};

const FollowedPoolCard: React.FC<FollowedPoolCardProps> = ({
    pool,
    onPress,
    testID,
    logoSize = 44,
    borderRadius = 16,
    padding = 12,
    marginBottom = 12,
}) => {
    const theme = useAppTheme();

    const isReg = isRegional(pool.leagueCode);
    const title = pool.name;
    const division = pool.division;
    const gradient = division
        ? [
            division.firstGradientColor,
            division.secondGradientColor,
            division.thirdGradientColor,
        ] as const
        : [
            theme.backgroundSecondary,
            theme.backgroundSecondary,
            theme.backgroundSecondary,
        ] as const;

    const chips: EntityCardChip[] = [];

    if (division?.name) {
        chips.push({
            label: division.name,
            borderColor: division.mainColor,
            backgroundColor: withAlpha(division.mainColor, 0.12),
        });
    }

    if (isReg && pool.leagueName) {
        chips.push({
            label: pool.leagueName,
            borderColor: theme.textInactive,
            backgroundColor: withAlpha(theme.textInactive, 0.12),
        });
    }

    if (pool.gender) {
        let genderColor: string;
        switch (pool.gender) {
            case EnumGender.M:
                genderColor = theme.male;
                break;
            case EnumGender.F:
                genderColor = theme.female;
                break;
            case EnumGender.O:
            default:
                genderColor = theme.textSecondary;
                break;
        }

        chips.push({
            label: GenderLabels[pool.gender],
            borderColor: genderColor,
            backgroundColor: withAlpha(genderColor, 0.12),
        });
    }

    if (pool.season) {
        chips.push({
            label: pool.season,
            borderColor: theme.textInactive,
            backgroundColor: withAlpha(theme.textInactive, 0.12),
        });
    }

    if (pool.format) {
        chips.push({
            label: FormatLabels[pool.format],
            borderColor: theme.textInactive,
            backgroundColor: withAlpha(theme.textInactive, 0.12),
        });
    }

    return (
        <EntityGradientCard
            title={title}
            imageUri={division?.logoUrl ?? null}
            chips={chips}
            onPress={onPress}
            testID={testID}
            logoSize={logoSize}
            borderRadius={borderRadius}
            padding={padding}
            marginBottom={marginBottom}
            gradient={gradient}
            allowChipWrap={false}
        />
    );
};

export default FollowedPoolCard;
