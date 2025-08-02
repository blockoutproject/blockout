import { useEffect } from 'react';
import { SplashScreen } from 'expo-router';
import { useUserContext } from '@/src/context/UserProvider';
import { useSession } from '../context/SessionProvider';

export function SplashScreenController() {
    const { isLoading: authLoading } = useSession();
    const { isLoading: userLoading } = useUserContext();
    const booting = authLoading || userLoading;

    useEffect(() => {
        if (!booting) {
            SplashScreen.hideAsync();
        }
    }, [booting]);

    return null;
}