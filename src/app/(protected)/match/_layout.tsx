import React from 'react';
import { Stack } from 'expo-router';
import MatchHeader from '@/src/components/match/components/MatchHeader';

const MatchLayout: React.FC = () => {
    return (
        <Stack>
            <Stack.Screen
                name="[match_id]"
                options={{
                    header: () => <MatchHeader />,
                    headerTransparent: true,
                    animation: 'slide_from_right',
                }}
            />
        </Stack>
    );
};

export default MatchLayout;