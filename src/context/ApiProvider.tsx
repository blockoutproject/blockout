import React, { useEffect } from 'react';
import { useAuth0 } from 'react-native-auth0';
import MatchesApi from '@/src/api/MatchesApi';
import TeamsApi from '@/src/api/TeamsApi';
import PoolsApi from '@/src/api/PoolsApi';
import CompetitionsApi from '@/src/api/CompetitionsApi';
import UsersApi from '@/src/api/UsersApi';

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { getCredentials, user } = useAuth0();

    useEffect(() => {
        const initializeApis = async () => {
            if (user) {
                console.info('Utilisateur connecté :', user);
                try {
                    const credentials = await getCredentials();
                    const token = credentials?.accessToken;

                    if (token) {
                        console.info('Token récupéré avec succès :', token);
                        // Initialiser les APIs avec le token
                        MatchesApi.initInstance(token);
                        TeamsApi.initInstance(token);
                        PoolsApi.initInstance(token);
                        CompetitionsApi.initInstance(token);
                        UsersApi.initInstance(token);

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