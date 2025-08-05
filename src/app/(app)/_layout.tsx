import React from 'react';
import { Stack } from 'expo-router';
import { SheetProvider } from '@/src/context/SheetProvider';

export default function ProtectedLayout() {
    return (
        <SheetProvider>
            <Stack
                screenOptions={{
                    headerShown: false
                }}
            >
                <Stack.Screen
                    name="index"
                    options={{
                        headerShown: false,
                    }}
                />
            </Stack>
        </SheetProvider>
    );
}