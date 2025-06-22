import { useAuth0 } from 'react-native-auth0';
import jwtDecode from 'jwt-decode';
import { useEffect, useState } from 'react';

type JwtPayloadWithPermissions = {
    permissions?: string[];
};

export const useHasScopes = (requiredScopes: string[]): boolean => {
    const { getCredentials } = useAuth0();
    const [hasScopes, setHasScopes] = useState(false);

    useEffect(() => {
        const checkScopes = async () => {
            try {
                const credentials = await getCredentials();

                if (!credentials?.accessToken) {
                    setHasScopes(false);
                    return;
                }

                const decoded = jwtDecode<JwtPayloadWithPermissions>(credentials.accessToken);
                const userScopes = decoded.permissions ?? [];

                const allScopesPresent = requiredScopes.every(scope =>
                    userScopes.includes(scope)
                );

                setHasScopes(allScopesPresent);
            } catch (err) {
                console.error('Erreur lors de la vérification des scopes :', err);
                setHasScopes(false);
            }
        };

        checkScopes();
    }, [requiredScopes]);

    return hasScopes;
};