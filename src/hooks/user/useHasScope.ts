import { useEffect, useMemo, useState } from 'react';
import { useAuth0 } from 'react-native-auth0';
import { jwtDecode } from 'jwt-decode'; // v4 : import nommé
import { useSession } from '@/src/context/SessionProvider';

type JwtPayloadWithPermissions = {
    permissions?: string[];
};

/**
 * Retourne true si TOUS les scopes requis sont présents.
 * - Appelle getCredentials() seulement quand la session est authentifiée,
 *   et quand la liste des scopes change (clé mémoïsée).
 */
export const useHasScopes = (requiredScopes: string[]): boolean => {
    const { session } = useSession();
    const { getCredentials } = useAuth0();
    const [hasScopes, setHasScopes] = useState(false);

    // Clé stable pour éviter des reruns inutiles
    const key = useMemo(
        () => JSON.stringify([...new Set(requiredScopes)].sort()),
        [requiredScopes]
    );

    useEffect(() => {
        let alive = true;

        if (!session || requiredScopes.length === 0) {
            if (alive) setHasScopes(false);
            return () => {
                alive = false;
            };
        }

        (async () => {
            try {
                const { accessToken } = await getCredentials();
                if (!accessToken) {
                    if (alive) setHasScopes(false);
                    return;
                }

                const decoded = jwtDecode<JwtPayloadWithPermissions>(accessToken);
                const userScopes = decoded.permissions ?? [];
                const ok = requiredScopes.every((s) => userScopes.includes(s));
                if (alive) setHasScopes(ok);
            } catch (err) {
                console.warn('useHasScopes: unable to read credentials/scopes', err);
                if (alive) setHasScopes(false);
            }
        })();

        return () => {
            alive = false;
        };
    }, [session, key, getCredentials]);

    return hasScopes;
};