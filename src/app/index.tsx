import { Redirect } from 'expo-router';
import { useSession } from '@/src/context/SessionProvider';

export default function Index() {
    const { session } = useSession();
    return <Redirect href={session ? '/(protected)/home' : '/(auth)/login'} />;
}