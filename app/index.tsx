// app/index.tsx
import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth0 } from 'react-native-auth0';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
    const { user, isLoading } = useAuth0();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        if (user) {
            router.replace('/home');
        } else {
            router.replace('/login');
        }
    }, [user, isLoading, router]);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" />
        </View>
    );
}