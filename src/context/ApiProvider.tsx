import React, { useEffect, useRef } from 'react';
import { useAuth0 } from 'react-native-auth0';
import { useSession } from '@/src/context/SessionProvider';

import MatchesApi from '@/src/api/MatchesApi';
import TeamsApi from '@/src/api/TeamsApi';
import PoolsApi from '@/src/api/PoolsApi';
import CompetitionsApi from '@/src/api/CompetitionsApi';
import UsersApi from '@/src/api/UsersApi';
import SearchApi from '@/src/api/SearchApi';
import MobileGatewayApi from '@/src/api/MobileGatewayApi';
import ConfigApi from '@/src/api/ConfigApi';
import ClubsApi from '@/src/api/ClubsApi';

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { session } = useSession();
    const { getCredentials } = useAuth0();
    const initializedRef = useRef(false);

    useEffect(() => {
        if (!session) { initializedRef.current = false; return; }
        if (initializedRef.current) return;

        (async () => {
            try {
                const creds = await getCredentials();
                const token = creds?.accessToken;
                if (!token) return;

                console.log('Initializing APIs with token:', token);

                MatchesApi.initInstance(token);
                TeamsApi.initInstance(token);
                PoolsApi.initInstance(token);
                CompetitionsApi.initInstance(token);
                UsersApi.initInstance(token);
                SearchApi.initInstance(token);
                MobileGatewayApi.initInstance(token);
                ConfigApi.initInstance(token);
                ClubsApi.initInstance(token);

                initializedRef.current = true;
            } catch (e) {
                console.error('API init failed:', e);
            }
        })();
    }, [session, getCredentials]);

    return <>{children}</>;
};