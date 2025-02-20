import React from 'react';
import { Stack } from 'expo-router';
import MatchHeader from '@/components/match/MatchHeader';

const MatchLayout: React.FC = () =>{
    return (
        <Stack
            screenOptions={{
                presentation: 'modal',
                header: () => <MatchHeader />,
            }}
        >
            <Stack.Screen name="[match_id]" />
        </Stack>
    );
}

export default MatchLayout;