import { useEffect, useState } from "react";
import {
  type EmitterSubscription,
  Keyboard,
  KeyboardEventName,
  Platform,
} from "react-native";

/**
 * useKeyboardIsVisible
 * Retourne `true` si le clavier est visible, `false` sinon.
 * Compatible iOS/Android (Expo SDK 54 / RN 0.81).
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onShow = () => setVisible(true);
    const onHide = () => setVisible(false);

    // Sur iOS, on écoute will+did pour une UX plus réactive.
    const showEvents: KeyboardEventName[] =
      Platform.OS === "ios"
        ? ["keyboardWillShow", "keyboardDidShow"]
        : ["keyboardDidShow"];

    const hideEvents: KeyboardEventName[] =
      Platform.OS === "ios"
        ? ["keyboardWillHide", "keyboardDidHide"]
        : ["keyboardDidHide"];

    const subs: EmitterSubscription[] = [];
    showEvents.forEach((evt) => subs.push(Keyboard.addListener(evt, onShow)));
    hideEvents.forEach((evt) => subs.push(Keyboard.addListener(evt, onHide)));

    return () => subs.forEach((s) => s.remove());
  }, []);

  return visible;
}
