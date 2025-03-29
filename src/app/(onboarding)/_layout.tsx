// app/(auth)/_layout.tsx (ou AuthLayout.tsx)
import React, { useEffect } from 'react';
import { Slot, useRouter } from 'expo-router';
import { useAuth0 } from 'react-native-auth0';
import { View, ActivityIndicator } from 'react-native';
import { useUser } from '@/src/hooks/user/useUser';

export default function AuthLayout() {
    const router = useRouter();
    const { user: auth0User, isLoading: isAuth0Loading } = useAuth0();
    const { data: customUser, isLoading: isUserLoading } = useUser();

    const isLoadingCombined = isAuth0Loading || isUserLoading;

    useEffect(() => {
        if (!isLoadingCombined && auth0User) {
            if (!customUser) {
                router.replace('/(onboarding)/pseudo');
            } else {
                if (!customUser.pseudo) {
                    router.replace('/(onboarding)/pseudo');
                } else {
                    router.replace('/home');
                }
            }
        }
    }, [isLoadingCombined, auth0User, customUser, router]);

    if (isLoadingCombined) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size='large' />
            </View>
        );
    }

    return <Slot />;
}