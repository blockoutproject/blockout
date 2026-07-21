import React from "react";
import {useAppTheme} from "@/src/shared/providers/ThemeProvider";
import {PoolSearchDocDTO} from "@/src/types/Pool";
import {isRegional, withAlpha} from "@/src/utils/utils";
import EntityGradientCard, {EntityCardChip} from "@/src/shared/ui/EntityGradientCard";
import {EnumFormat, FormatLabels} from "@/src/types/enums/Format";
import {EnumGender, GenderLabels} from "@/src/types/enums/Gender";

export type PoolCardProps = {
  pool: PoolSearchDocDTO;
  onPress: () => void;
};

const PoolCard: React.FC<PoolCardProps> = ({pool, onPress}) => {
  const theme = useAppTheme();
  const isReg = isRegional(pool.leagueCode);
  const chips: EntityCardChip[] = [];

  if (pool.divisionName) {
    chips.push({
      label: pool.divisionName,
      borderColor: pool.divisionMainColor || theme.textInactive,
      backgroundColor: withAlpha(pool.divisionMainColor || theme.textInactive, 0.12),
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
      label: GenderLabels[pool.gender as EnumGender],
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
      label: FormatLabels[pool.format as EnumFormat],
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
      testID="pool-card"
      marginBottom={12}
      allowChipWrap
    />
  );
};

export default PoolCard;
