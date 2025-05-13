import React from 'react';
import { Stack } from 'expo-router';
import MatchHeader from '@/src/components/match/MatchHeader';

const MatchLayout: React.FC = () =>{
    return (
        <Stack
            screenOptions={{
                presentation: 'modal',
                header: () => <MatchHeader />,
            }}
        >
            <Stack.Screen name="[matchId]" />
        </Stack>
    );
}

export default MatchLayout;