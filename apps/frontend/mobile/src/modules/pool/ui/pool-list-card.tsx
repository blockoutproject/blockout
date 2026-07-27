import React from "react";
import { useAppTheme } from "@/src/shared/theme";
import type { PoolSummaryResponse } from "@/src/shared/generated/models";
import EntityCard from "@/src/shared/ui/entity/entity-card";
import { toPoolCardPresentation } from "@/src/modules/pool/view-models/pool-card-presentation";

export type PoolListCardProps = {
  pool: PoolSummaryResponse;
  onPress: () => void;
  testID?: string;
};

const PoolListCard: React.FC<PoolListCardProps> = ({
  pool,
  onPress,
  testID,
}) => {
  const theme = useAppTheme();
  const presentation = toPoolCardPresentation(pool, {
    neutral: theme.textInactive,
    male: theme.male,
    female: theme.female,
    mixed: theme.textSecondary,
  });

  return (
    <EntityCard presentation={presentation} onPress={onPress} testID={testID} />
  );
};

export default PoolListCard;
