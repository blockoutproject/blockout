import React from 'react';
import { Stack } from 'expo-router';
import SearchHeader from '@/src/components/search/components/SearchHeader';

export default function ProtectedLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false
            }}
        >
            <Stack.Screen
                name="home"
                options={{
                    headerShown: false,
                }}
            />
            <Stack.Screen
                name="search"
                options={{
                    animation: 'fade_from_bottom',
                    headerShown: true,
                    header: () => <SearchHeader />,
                }}
            />
        </Stack>
    );
}