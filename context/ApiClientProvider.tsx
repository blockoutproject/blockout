import React, { useEffect } from 'react';
import { useAuth0 } from 'react-native-auth0';
import MatchesApi from '@/api/MatchesApi';
import TeamsApi from '@/api/TeamsApi';
import PoolsApi from '@/api/PoolsApi';

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { getCredentials, user } = useAuth0();

    useEffect(() => {
        const initializeApis = async () => {
            if (user) { // Vérifier si l'utilisateur est authentifié
                try {
                    const credentials = await getCredentials();
                    const token = credentials?.accessToken;

                    if (token) {
                        console.info('Token récupéré avec succès :', token);
                        // Initialiser les APIs avec le token
                        MatchesApi.initInstance(token);
                        TeamsApi.initInstance(token);
                        PoolsApi.initInstance(token);

                        console.info('APIs initialisées avec succès.');
                    }
                } catch (error) {
                    console.error('Erreur lors de l\'initialisation des APIs :', error);
                }
            }
        };

        initializeApis();
    }, [getCredentials, user]);

    return <>{children}</>;
};