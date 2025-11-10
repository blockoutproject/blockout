import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { DevicePlatform, RegisterPushTokenRequest } from "../types/Notification";
import * as Linking from "expo-linking";
import { useApis } from "../context/ApiProvider";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export function openNotificationUrlIfAny(data?: Record<string, unknown>) {
    const url = (data?.url as string) || null;
    if (!url) return;
    try {
        Linking.openURL(url);
    } catch (e) {
        console.warn("[notifications] openURL failed", e);
    }
}

export function platformToEnum(): DevicePlatform {
    if (Platform.OS === "ios") return "IOS";
    if (Platform.OS === "android") return "ANDROID";
    if (Platform.OS === "web") return "WEB";
    return "UNKNOWN";
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
        });
    }

    if (!Device.isDevice) {
        alert("Must use physical device for push notifications");
        return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    if (finalStatus !== "granted") {
        return null;
    }

    const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId) {
        alert("Project ID not found");
        return null;
    }

    const pushToken = (
        await Notifications.getExpoPushTokenAsync({ projectId })
    ).data;

    return pushToken ?? null;
}

/**
 * Enregistre le token côté backend
 */
export async function registerPushTokenOnBackend(
    userId: number,
    expoPushToken: string | null
) {

    const { mobile } = useApis();

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
}

/**
 * Utilitaires listeners (comme dans l’exemple)
 * A appeler dans un useEffect au root si tu veux capter les notifs entrantes
 */
export function addNotificationListeners(
    {
        onReceive,
        onRespond,
    }: {
        onReceive?: (n: Notifications.Notification) => void;
        onRespond?: (r: Notifications.NotificationResponse) => void;
    }
) {
    const sub1 = Notifications.addNotificationReceivedListener((n) => {
        onReceive?.(n);
    });
    const sub2 = Notifications.addNotificationResponseReceivedListener((r) => {
        onRespond?.(r);
    });
    return () => {
        sub1.remove();
        sub2.remove();
    };
}

/**
 * Helper pour envoyer un push test via l’endpoint Expo (exactement comme l’exemple)
 * ⚠️ pour debug uniquement
 */
export async function sendTestPush(expoPushToken: string) {
    const message = {
        to: expoPushToken,
        sound: "default",
        title: "Original Title",
        body: "And here is the body!",
        data: { someData: "goes here" },
    };

    await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
            Accept: "application/json",
            "Accept-encoding": "gzip, deflate",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
    });
}