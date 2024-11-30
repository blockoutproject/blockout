import { AxiosError } from "axios";

const errorInterceptor = (error: AxiosError): Promise<never> => {
    if (error.response) {
        const status = error.response.status;
        if (status === 401) {
            console.error("Token expiré ou non valide.");
        } else if (status >= 500) {
            console.error("Erreur serveur :", error.response.data);
        }
    } else if (error.request) {
        console.error("Pas de réponse du serveur :", error.message);
    } else {
        console.error("Erreur de configuration :", error.message);
    }
    return Promise.reject(error);
};

export default errorInterceptor;