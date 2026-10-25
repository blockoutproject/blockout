import { useEffect, useRef } from "react";
import { usePreventRemove } from "expo-router";
import { Alert } from "react-native";

/** Confirms navigation against actual form dirtiness; the owner resets/releases its draft, and unmount invalidates the native confirmation. */
export function useDiscardChanges(dirty: boolean, discard: () => void) {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  usePreventRemove(dirty, ({ repeat }) =>
    Alert.alert(
      "Abandonner les modifications ?",
      "Votre brouillon n’a pas été enregistré.",
      [
        { text: "Continuer la saisie", style: "cancel" },
        {
          text: "Abandonner",
          style: "destructive",
          onPress: () => {
            if (!mounted.current) return;
            discard();
            repeat();
          },
        },
      ],
    ),
  );
}
