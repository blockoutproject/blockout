import { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useUserContext } from '@/src/context/UserProvider';

export const useAuthGuard = () => {
    const router = useRouter();
    const segments = useSegments();
    const { auth0User, customUser, isLoading } = useUserContext();

    useEffect(() => {
        if (isLoading) return;

        const currentGroup = segments[0];

        const inAuthGroup = currentGroup === '(auth)';
        const inProtectedGroup = currentGroup === '(protected)';

        if (!auth0User && inProtectedGroup) {
            router.replace('/(auth)/login');
        } else if (auth0User && customUser && inAuthGroup) {
            router.replace('/(protected)/home');
        }
    }, [auth0User, customUser, isLoading, segments]);
};