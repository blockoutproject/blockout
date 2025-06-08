import React from 'react';
import { View } from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useAppTheme } from '@/src/context/ThemeProvider';
import matchStyles from '@/src/components/match/matchStyles';

const MatchSkeleton: React.FC = () => {
    const theme = useAppTheme();

    return (
        <View style={[matchStyles.skeletonContainer, { backgroundColor: theme.background }]}>
            <Skeleton colors={[theme.backgroundSecondary, theme.surfaceSecondary, theme.backgroundSecondary]} width="100%" height={200} />
            <Skeleton colors={[theme.backgroundSecondary, theme.surfaceSecondary, theme.backgroundSecondary]} width="100%" height={150} />
            <Skeleton colors={[theme.backgroundSecondary, theme.surfaceSecondary, theme.backgroundSecondary]} width="100%" height={200} />
            <Skeleton colors={[theme.backgroundSecondary, theme.surfaceSecondary, theme.backgroundSecondary]} width="100%" height={250} />
        </View>
    );
};

export default MatchSkeleton;
