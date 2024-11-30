import { InternalAxiosRequestConfig } from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const authInterceptor = async (
    config: InternalAxiosRequestConfig
): Promise<InternalAxiosRequestConfig> => {
    const token = await AsyncStorage.getItem("authToken");

    if (token) {
        config.headers.set("Authorization", `Bearer ${token}`);
    }

    return config;
};

export default authInterceptor;