import { Alert } from "react-native";

type ConfirmOptions = {
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
};

export function confirm({
    title,
    message,
    confirmText = "Oui",
    cancelText = "Annuler",
    destructive = false,
}: ConfirmOptions): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        Alert.alert(
            title,
            message,
            [
                { text: cancelText, style: "cancel", onPress: () => resolve(false) },
                { text: confirmText, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
            ],
            { cancelable: true }
        );
    });
}