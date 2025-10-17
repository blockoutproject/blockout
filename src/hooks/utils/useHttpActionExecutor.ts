import { HttpAction } from "@/src/types/Match";
import axios from "axios";
import * as WebBrowser from "expo-web-browser";
import { useCallback } from "react";

/**
 * Hook qui exécute une HttpAction et ouvre le résultat (PDF) dans le navigateur.
 */
export function useHttpActionExecutor() {
    const execute = useCallback(async (action: HttpAction) => {
        try {
            const { method, encoding, url, params = [] } = action;

            // Prépare le body ou la query selon la méthode
            let response;

            if (method === "GET") {
                const queryParams = Object.fromEntries(params.map(p => [p.name, p.value]));
                response = await axios.get(url, { params: queryParams, responseType: "blob" });
            } else {
                if (encoding === "URLENCODED") {
                    const form = new URLSearchParams();
                    params.forEach(p => form.append(p.name, p.value));
                    response = await axios.post(url, form, { responseType: "blob" });
                } else {
                    const form = new FormData();
                    params.forEach(p => form.append(p.name, p.value));
                    response = await axios.post(url, form, { responseType: "blob" });
                }
            }

            // Création d’un blob temporaire pour ouvrir dans le navigateur
            const blob = new Blob([response.data], { type: "application/pdf" });
            const blobUrl = URL.createObjectURL(blob);

            await WebBrowser.openBrowserAsync(blobUrl);
        } catch (error) {
            console.error("Erreur lors de l’exécution de l’action HTTP :", error);
            alert("Impossible d’ouvrir le document.");
        }
    }, []);

    return { execute };
}