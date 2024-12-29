import { CONFIG } from './config';
import { useAuth0 } from 'react-native-auth0';

export const auth0Config = {
    domain: CONFIG.AUTH0_DOMAIN,
    clientId: CONFIG.AUTH0_CLIENT_ID,
};

export const getAccessToken = async (): Promise<string | null> => {
    const { getCredentials } = useAuth0();

    try {
        const credentials = await getCredentials(); // Récupère ou rafraîchit le token
        return credentials?.accessToken || null; // Retourne le token d'accès
    } catch (error) {
        console.error('Erreur lors de la récupération des credentials :', error);
        return null;
    }
};