import React from 'react';
import { Slot, Stack } from 'expo-router';
import { SheetProvider } from '@/src/context/SheetProvider';

export default function ProtectedLayout() {
    return (
        <SheetProvider>
            <Slot />
        </SheetProvider>
    );
}