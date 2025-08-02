import React from 'react';
import { Slot, Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false
            }}
        >
            <Stack.Screen name="login" />
        </Stack>
    );
}