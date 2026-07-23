import { useMemo } from "react";
import { gradients } from "@/src/shared/theme";
import {
  getGradientVariants,
  type GradientVariants,
} from "@/src/shared/lib/utils";

export const usePoolBorderGradient = (poolId: number): GradientVariants => {
  return useMemo(() => {
    const baseColors =
      gradients.poolBorders[poolId % gradients.poolBorders.length];
    return getGradientVariants(baseColors);
  }, [poolId]);
};
