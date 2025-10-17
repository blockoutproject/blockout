import React, { useMemo } from "react";
import { Platform } from "react-native";
import { WebView } from "react-native-webview";
import * as WebBrowser from "expo-web-browser";
import { buildAutoSubmitHtml, toFormUrlEncoded } from "@/src/utils/builders";
import { HttpAction } from "@/src/types/Match";

type Props = { action: HttpAction; onError?: (e: any) => void };

// Un composant qui “ouvre” le document selon la recette.
export default function OpenDocument({ action, onError }: Props) {
    const source = useMemo(() => {
        if (action.method === "POST" && action.encoding === "URLENCODED") {
            return {
                uri: action.url,
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: toFormUrlEncoded(action.params ?? []),
            } as const;
        }
        if (action.method === "POST" && action.encoding === "MULTIPART") {
            // Génère une page HTML avec form multipart + auto-submit
            const html = buildAutoSubmitHtml(action.url, action.params ?? [], true);
            return { html } as const;
        }
        // GET par défaut (peu probable dans ce flow)
        return { uri: action.url } as const;
    }, [action]);

    return (
        <WebView
            style={{ flex: 1 }}
            source={source as any}
            onError={onError}
        />
    );
}