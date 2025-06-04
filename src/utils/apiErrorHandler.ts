import { Alert } from 'react-native';
import { ApiError } from '@/src/api/AbstractApi';

export function getApiErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        switch (error.status) {
            case 0:
                return "Impossible de contacter le serveur. Vérifiez votre connexion.";
            case 400:
                return "Requête invalide.";
            case 401:
                return "Session expirée. Veuillez vous reconnecter.";
            case 403:
                return "Vous n’avez pas les droits pour cette action.";
            case 404:
                return "Ressource introuvable.";
            case 500:
                return "Erreur interne du serveur. Réessayez plus tard.";
            default:
                return `Erreur inconnue (${error.status}).`;
        }
    }
    return "Une erreur est survenue. Veuillez réessayer.";
}

export function showApiError(error: unknown): void {
    const message = getApiErrorMessage(error);
    Alert.alert("Erreur", message); // ou utiliser un toast
}