import React from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { MatchHeader } from '@/components/match/MatchHeader';
import { PoolHeader } from '@/components/pool/PoolHeader';

export default function PoolLayout() {

    return (
        <Stack
            screenOptions={{
                presentation: 'modal',
                header: () => <PoolHeader />,
            }}
        >
            <Stack.Screen name="[pool_id]" />
        </Stack>
    );
}