import * as Device from "expo-device";
import { useApis } from "@/src/context/ApiProvider";
import { RegisterPushTokenRequest } from "@/src/types/Notification";
import { platformToEnum } from "@/src/utils/notifications";

/**
 * Custom hook qui expose une fonction de registration.
 * -> Ici on a le droit d'utiliser `useApis()`.
 */
export function useRegisterPushToken() {
    const { mobile } = useApis();

    return async (userId: number, expoPushToken: string | null) => {
        if (!expoPushToken) return;

        const deviceId = Device.isDevice
            ? Device.osInternalBuildId ?? Device.osBuildId ?? null
            : null;

        const payload: RegisterPushTokenRequest = {
            expoPushToken,
            platform: platformToEnum(),
            deviceId,
        };

        await mobile.registerPushToken(userId, payload);
    };
}