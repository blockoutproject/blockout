import React from 'react';
import { Slot } from 'expo-router';
import { useAuthGuard } from '@/src/hooks/auth/useAuthGuard';
import AppLoader from '@/src/components/common/AppLoader';
import { useUserContext } from '@/src/context/UserProvider';

export default function AuthLayout() {
    useAuthGuard();
    const { isLoading } = useUserContext();

    if (isLoading) {
        return <AppLoader />;
    }
    return <Slot />;
}