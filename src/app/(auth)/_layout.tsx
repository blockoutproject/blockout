import React from 'react';
import { Slot } from 'expo-router';
import { useUserContext } from '@/src/hooks/user/useUserContext';
import { useAuthGuard } from '@/src/hooks/auth/useAuthGuard';
import AppLoader from '@/src/components/common/AppLoader';

export default function AuthLayout() {
    useAuthGuard();
    const { isLoading } = useUserContext();

    if (isLoading) {
        return <AppLoader />;
    }
    return <Slot />;
}