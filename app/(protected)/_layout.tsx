import React, { useEffect } from 'react';
import { router, Stack } from 'expo-router';
import { useAuth0 } from 'react-native-auth0';
import { View, ActivityIndicator } from 'react-native';
import HomeHeader from '@/components/home/HomeHeader';

const ProtectedLayout: React.FC = () => {
    const { user, isLoading } = useAuth0();

    useEffect(() => {
        if (!isLoading && !user) {
            router.replace('/login');
        }
    }, [isLoading, user]);

    if (isLoading || !user) {
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
        </Stack>
    );
}

export default ProtectedLayout;