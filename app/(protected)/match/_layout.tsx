import React from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { MatchHeader } from '@/components/match/MatchHeader';

export default function MatchLayout() {

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