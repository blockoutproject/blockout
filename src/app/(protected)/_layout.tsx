import React, { useEffect } from 'react';
import { router, Stack } from 'expo-router';
import { useAuth0 } from 'react-native-auth0';
import { View, ActivityIndicator } from 'react-native';
import HomeHeader from '@/src/components/home/HomeHeader';
import { useUserContext } from '@/src/hooks/user/useUserContext';
import { useAuthGuard } from '@/src/hooks/auth/useAuthGuard';

const ProtectedLayout: React.FC = () => {
    useAuthGuard();
    const { auth0User, customUser, isLoading } = useUserContext();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <Stack>
            {/* Écran principal (home) */}
            <Stack.Screen
                name="home"
                options={{
                    header: () => <HomeHeader />
                }}
            />
            <Stack.Screen
                name="match"
                options={{
                    presentation: 'modal',
                    headerShown: false
                }}
            />
            <Stack.Screen
                name="pool"
                options={{
                    presentation: 'modal',
                    headerShown: false
                }}
            />
            <Stack.Screen
                name="team"
                options={{
                    presentation: 'modal',
                    headerShown: false
                }}
            />
            <Stack.Screen
                name="profile"
                options={{
                    presentation: 'card',
                    headerShown: false
                }}
            />
        </Stack>
    );
}

export default ProtectedLayout;