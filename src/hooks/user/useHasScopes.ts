// src/hooks/useAuthScopes.ts
import { useEffect, useState, useCallback } from 'react';
import { useAuth0 } from 'react-native-auth0';
import { jwtDecode } from 'jwt-decode';

type JwtPayloadWithPermissions = {
    permissions?: string[];
};

type UseAuthScopesResult = {
    hasScopes: (required: string[]) => boolean;
    loading: boolean;
};

export default function useHasScopes(requiredScopes: string[]): UseAuthScopesResult {
    const { getCredentials } = useAuth0();
    const [scopes, setScopes] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState<boolean>(true);

    const parseScopes = (token: string | null) => {
        if (!token) return new Set<string>();
        const decoded = jwtDecode<JwtPayloadWithPermissions>(token);
        return new Set(decoded.permissions ?? []);
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const credentials = await getCredentials();
            const token = credentials?.accessToken ?? null;
            setScopes(parseScopes(token));
        } catch {
            setScopes(new Set());
        } finally {
            setLoading(false);
        }
    }, [getCredentials]);

    useEffect(() => {
        load();
    }, [load, requiredScopes.length]);

    const hasScopes = (req: string[]) => req.every((s) => scopes.has(s));

    return { hasScopes, loading };
}