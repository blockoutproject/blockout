import React from 'react';
import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
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
                headerShown: false, // par défaut désactivé
            }}
        >
            <Stack.Screen
                name="home"
                options={{
                }}
            />
            <Stack.Screen
                name="match"
                options={{
                    presentation: 'modal',
                }}
            />
            <Stack.Screen
                name="pool"
                options={{
                    presentation: 'modal',
                }}
            />
            <Stack.Screen
                name="team"
                options={{
                    presentation: 'modal',
                }}
            />
            <Stack.Screen
                name="profile"
                options={{
                    presentation: 'card',
                }}
            />
            <Stack.Screen
                name="search"
                options={{
                    presentation: 'modal',
                }}
            />
        </Stack>
    );
}

export default ProtectedLayout;