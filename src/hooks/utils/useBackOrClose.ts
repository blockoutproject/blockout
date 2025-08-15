import { useCallback } from "react";
import { NavigationProp, useNavigation } from "@react-navigation/native";

export function useBackOrClose(onCloseSheet?: () => void) {
    const navigation = useNavigation<NavigationProp<Record<string, object | undefined>>>();

    const handleBack = useCallback(() => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            onCloseSheet?.();
        }
    }, [navigation, onCloseSheet]);

    const canGoBack = navigation.canGoBack();

    return { handleBack, canGoBack };
}