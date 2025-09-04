import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import NotificationsApi, {
    DevicePlatform,
    RegisterPushTokenRequest,
} from "@/src/api/NotificationsApi";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export function platformToEnum(): DevicePlatform {
    if (Platform.OS === "ios") return DevicePlatform.IOS;
    if (Platform.OS === "android") return DevicePlatform.ANDROID;
    if (Platform.OS === "web") return DevicePlatform.WEB;
    return DevicePlatform.UNKNOWN;
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
    if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
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
        alert("Permission not granted to get push token for push notification!");
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
 * Enregistre le token côté backend via ton NotificationsApi
 */
export async function registerPushTokenOnBackend(
    userId: number,
    expoPushToken: string | null
) {
    if (!expoPushToken) return;

    const deviceId = Device.isDevice
        ? Device.osInternalBuildId ?? Device.osBuildId ?? null
        : null;

    console.log("Registering push token on backend:", { userId, expoPushToken, deviceId });

    const payload: RegisterPushTokenRequest = {
        expoPushToken,
        platform: platformToEnum(),
        deviceId,
    };

    console.log("Payload:", payload);
    await NotificationsApi.getInstance().registerPushToken(userId, payload);
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