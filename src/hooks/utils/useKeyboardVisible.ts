import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

export default function useKeyboardVisible() {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

        const showSub = Keyboard.addListener(showEvt as any, () => setVisible(true));
        const hideSub = Keyboard.addListener(hideEvt as any, () => setVisible(false));

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    return visible;
}