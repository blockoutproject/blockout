import React from 'react';
import { Stack } from 'expo-router';
import PoolHeader from '@/src/components/pool/PoolHeader';

const PoolLayout: React.FC = () => {
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

export default PoolLayout;