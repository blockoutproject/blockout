import React, { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useUserContext } from '@/src/hooks/user/useUserContext';
import { useAuthGuard } from '@/src/hooks/auth/useAuthGuard';
import AppLoader from '@/src/components/common/AppLoader';

export default function OnboardingLayout() {
    useAuthGuard();
    const { isLoading } = useUserContext();

    if (isLoading) {
        return <AppLoader />;
    }

    return <Slot />;
}