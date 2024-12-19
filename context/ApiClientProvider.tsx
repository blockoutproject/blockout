import React, { useEffect } from 'react';
import { useAuth0 } from 'react-native-auth0';
import MatchesApi from '@/matches/v1Api';
import TeamsApi from '@/teams/v1Api';

// Un simple Provider
export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { getCredentials, user } = useAuth0(); // Utiliser Auth0 pour récupérer les credentials

    useEffect(() => {
        const initializeApis = async () => {
            if (user) { // Vérifier si l'utilisateur est authentifié
                try {
                    const credentials = await getCredentials();
                    const token = credentials?.accessToken;

                    if (token) {
                        // Initialiser les APIs avec le token
                        MatchesApi.initInstance(token);
                        TeamsApi.initInstance(token);

                        console.info('APIs initialisées avec succès.');
                    }
                } catch (error) {
                    console.error('Erreur lors de l\'initialisation des APIs :', error);
                }
            }
        };

        initializeApis();
    }, [getCredentials, user]); // Se réexécute si `user` change

    return <>{children}</>; // N'affiche que les enfants
};