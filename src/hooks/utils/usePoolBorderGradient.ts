import { useMemo } from "react";
import { poolBorderColorPalettes } from "@/src/constants/themes";
import { getGradientVariants, GradientVariants } from "@/src/utils/utils";

export const usePoolBorderGradient = (poolId: number): GradientVariants => {
    return useMemo(() => {
        const baseColors = poolBorderColorPalettes[poolId % poolBorderColorPalettes.length];
        return getGradientVariants(baseColors);
    }, [poolId]);
};