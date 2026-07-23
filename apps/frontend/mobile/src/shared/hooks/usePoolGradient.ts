import { useMemo } from "react";
import { poolFills } from "@/src/shared/theme";
import {
  getGradientVariants,
  type GradientVariants,
} from "@/src/shared/lib/utils";

export const usePoolGradient = (poolId: number): GradientVariants => {
  return useMemo(() => {
    const baseColors = poolFills[poolId % poolFills.length];
    return getGradientVariants(baseColors);
  }, [poolId]);
};
