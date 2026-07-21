import {useMemo} from "react";
import {poolColorPalettes} from "@/src/shared/theme/themes";
import {getGradientVariants, GradientVariants} from "@/src/utils/utils";

export const usePoolGradient = (poolId: number): GradientVariants => {
  return useMemo(() => {
    const baseColors = poolColorPalettes[poolId % poolColorPalettes.length];
    return getGradientVariants(baseColors);
  }, [poolId]);
};
