import { Platform } from "react-native";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";

export async function openPdf(url: string, title?: string) {
    if (!url) return;
    Haptics.selectionAsync();
    if (Platform.OS === "android") {
        router.push({ pathname: "/pdf-viewer", params: { url, title: title ?? "Document" } });
    } else {
        await WebBrowser.openBrowserAsync(url);
    }
}