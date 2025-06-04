import React from 'react';
import { Stack } from 'expo-router';
import { useUserContext } from '@/src/hooks/user/useUserContext';
import { useAuthGuard } from '@/src/hooks/auth/useAuthGuard';
import AppLoader from '@/src/components/common/AppLoader';

const ProtectedLayout: React.FC = () => {
    useAuthGuard();
    const { isLoading } = useUserContext();

    if (isLoading) {
        return <AppLoader />;
    }

    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen
                name="home"
            />
        </Stack>
    );
}

export default ProtectedLayout;