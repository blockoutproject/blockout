import React, { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useUserContext } from '@/src/hooks/user/useUserContext';
import { useAuthGuard } from '@/src/hooks/auth/useAuthGuard';

export default function AuthLayout() {
    useAuthGuard();
    const router = useRouter();
    const { auth0User, customUser, isLoading } = useUserContext();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111' }}>
                <ActivityIndicator size='small' />
            </View>
        );
    }
    return <Slot />;
}