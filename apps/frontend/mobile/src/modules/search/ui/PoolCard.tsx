import React from "react";
import { useAppTheme } from "@/src/shared/providers/ThemeProvider";
import type { PoolSearchResponse } from "@/src/shared/generated/models";
import { isRegional, withAlpha } from "@/src/shared/lib/utils";
import EntityGradientCard, {
  EntityCardChip,
} from "@/src/shared/ui/EntityGradientCard";
import { FormatEnum, FormatLabels } from "@/src/shared/model/formatLabels";
import { GenderEnum, GenderLabels } from "@/src/shared/model/genderLabels";

export type PoolCardProps = {
  pool: PoolSearchResponse;
  onPress: () => void;
};

const PoolCard: React.FC<PoolCardProps> = ({ pool, onPress }) => {
  const theme = useAppTheme();
  const isReg = isRegional(pool.leagueCode);
  const chips: EntityCardChip[] = [];

  if (pool.divisionName) {
    chips.push({
      label: pool.divisionName,
      borderColor: theme.textInactive,
      backgroundColor: withAlpha(theme.textInactive, 0.12),
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
      case GenderEnum.M:
        genderColor = theme.male;
        break;
      case GenderEnum.F:
        genderColor = theme.female;
        break;
      case GenderEnum.O:
      default:
        genderColor = theme.textSecondary;
        break;
    }

    chips.push({
      label: GenderLabels[pool.gender as GenderEnum],
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
      label: FormatLabels[pool.format as FormatEnum],
      borderColor: theme.textInactive,
      backgroundColor: withAlpha(theme.textInactive, 0.12),
    });
  }

  return (
    <EntityGradientCard
      title={pool.name}
      imageUri={pool.logoUrl}
      chips={chips}
      onPress={onPress}
      testID={`search-pool-item-${pool.id}`}
      marginBottom={12}
      allowChipWrap
    />
  );
};

export default PoolCard;
