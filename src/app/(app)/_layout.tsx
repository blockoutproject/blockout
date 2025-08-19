import React from 'react';
import { Slot } from 'expo-router';
import { SheetProvider } from '@/src/context/SheetProvider';

export default function ProtectedLayout() {
    return (
        <SheetProvider>
            <Slot />
        </SheetProvider>
    );
}