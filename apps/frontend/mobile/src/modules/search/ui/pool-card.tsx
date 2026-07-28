import React from "react";
import { useAppTheme } from "@/src/shared/theme";
import type { PoolSearchResponse } from "@/src/shared/generated/models";
import EntityCard from "@/src/shared/ui/entity/entity-card";
import { toSearchPoolCardPresentation } from "@/src/modules/search/view-models/search-card-presentation";

export type PoolCardProps = {
  pool: PoolSearchResponse;
  onPress: () => void;
};

const PoolCard: React.FC<PoolCardProps> = ({ pool, onPress }) => {
  const theme = useAppTheme();
  const presentation = toSearchPoolCardPresentation(pool, {
    neutral: theme.textInactive,
    male: theme.male,
    female: theme.female,
    mixed: theme.textSecondary,
  });

  return (
    <EntityCard
      presentation={presentation}
      onPress={onPress}
      testID={`search-pool-item-${pool.id}`}
    />
  );
};

export default PoolCard;
