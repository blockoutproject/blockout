import {useMemo} from "react";
import {poolBorderColorPalettes} from "@/src/shared/theme/themes";
import {getGradientVariants, GradientVariants} from "@/src/shared/lib/utils";

export const usePoolBorderGradient = (poolId: number): GradientVariants => {
  return useMemo(() => {
    const baseColors = poolBorderColorPalettes[poolId % poolBorderColorPalettes.length];
    return getGradientVariants(baseColors);
  }, [poolId]);
};
