import { useEffect, useMemo, useState } from "react";
import { useAuth0 } from "@/src/modules/session/auth/auth-provider";
import { jwtDecode } from "jwt-decode";

type JwtPayloadWithPermissions = { permissions?: string[] };

export type UseAuthScopesResult = {
  allowed: boolean;
  loading: boolean;
  error?: unknown;
};

export default function useHasScopes(
  requiredScopes: string[],
): UseAuthScopesResult {
  const { getCredentials, user } = useAuth0();
  const [perms, setPerms] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<unknown>(undefined);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setErr(undefined);
      try {
        const cred = await getCredentials(undefined, 60);
        const token = cred?.accessToken ?? null;

        const decoded = token
          ? jwtDecode<JwtPayloadWithPermissions>(token)
          : undefined;
        const p = new Set(decoded?.permissions ?? []);

        if (mounted) setPerms(p);
      } catch (e) {
        if (mounted) {
          setPerms(new Set());
          setErr(e);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [getCredentials, user]);

  const allowed = useMemo(() => {
    if (!requiredScopes?.length) return true;
    return requiredScopes.every((s) => perms.has(s));
  }, [requiredScopes, perms]);

  return { allowed, loading, error: err };
}
