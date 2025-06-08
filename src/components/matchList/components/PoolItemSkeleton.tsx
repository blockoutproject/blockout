import React from "react";
import { View } from "react-native";
import { Skeleton } from "moti/skeleton";
import GradientView from "@/src/components/common/GradientView";
import { useAppTheme } from "@/src/context/ThemeProvider";
import { matchListStyles } from "../matchListStyles";

const PoolItemSkeleton: React.FC = () => {
    const theme = useAppTheme();

    return (
        <GradientView style={matchListStyles.skeletonContainer}>
            <View style={matchListStyles.skeletonHeader}>
                <Skeleton width="70%" height={20} colors={[theme.background, theme.backgroundSecondary, theme.background]} />
            </View>
            <View style={matchListStyles.skeletonMatch}>
                <Skeleton width="100%" height={120} colors={[theme.background, theme.backgroundSecondary, theme.background]} />
            </View>
        </GradientView>
    );
};

export default PoolItemSkeleton;