import React, { useEffect } from "react";
import { useAuth0 } from "react-native-auth0";
import { useSession } from "@/src/context/SessionProvider";
import MatchesApi from "@/src/api/MatchesApi";
import TeamsApi from "@/src/api/TeamsApi";
import PoolsApi from "@/src/api/PoolsApi";
import CompetitionsApi from "@/src/api/CompetitionsApi";
import UsersApi from "@/src/api/UsersApi";
import SearchApi from "@/src/api/SearchApi";
import MobileGatewayApi from "@/src/api/MobileGatewayApi";
import ConfigApi from "@/src/api/ConfigApi";
import ClubsApi from "@/src/api/ClubsApi";
import ReportsApi from "../api/ReportsApi";
import NotificationsApi from "../api/NotificationsApi";

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { softResetAuth, auth0User } = useSession();
    const { getCredentials } = useAuth0();

    useEffect(() => {
        (async () => {
            try {
                if (!auth0User) {
                    console.log("API init skipped (session not ready yet)");
                    return;
                }
                const creds = await getCredentials(undefined, 60);
                const token = creds?.accessToken;
                if (!token) return;

                console.log("API init with token:", token);

                const tokenSupplier = async () => {
                    const c = await getCredentials(undefined, 60);
                    return c?.accessToken ?? null;
                };

                const onUnauthorized = async () => {
                    await softResetAuth();
                };

                MatchesApi.initInstance(token, { tokenSupplier, onUnauthorized });
                TeamsApi.initInstance(token, { tokenSupplier, onUnauthorized });
                PoolsApi.initInstance(token, { tokenSupplier, onUnauthorized });
                CompetitionsApi.initInstance(token, { tokenSupplier, onUnauthorized });
                UsersApi.initInstance(token, { tokenSupplier, onUnauthorized });
                SearchApi.initInstance(token, { tokenSupplier, onUnauthorized });
                MobileGatewayApi.initInstance(token, { tokenSupplier, onUnauthorized });
                ConfigApi.initInstance(token, { tokenSupplier, onUnauthorized });
                ClubsApi.initInstance(token, { tokenSupplier, onUnauthorized });
                ReportsApi.initInstance(token, { tokenSupplier, onUnauthorized });
                NotificationsApi.initInstance(token, { tokenSupplier, onUnauthorized });
            } catch (e) {
                console.log("API init skipped (credentials not ready yet):", e);
            }
        })();
    }, [auth0User, getCredentials, softResetAuth]);

    return <>{children}</>;
};