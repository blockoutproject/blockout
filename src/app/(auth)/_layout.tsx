import React, { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useUserContext } from '@/src/hooks/user/useUserContext';
import { useAuthGuard } from '@/src/hooks/auth/useAuthGuard';
import { colors } from '@/src/constants/Colors';

export default function AuthLayout() {
    useAuthGuard();
    const { isLoading } = useUserContext();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.dark }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }
    return <Slot />;
}