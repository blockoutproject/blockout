import { usePreventRemove } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";

/** Both ordinary collection editors use native navigation prevention to discard only by explicit choice. */
export function usePreparationDiscard(discard: () => void) {
  const [dirty, setDirty] = useState(false);
  usePreventRemove(dirty, ({ repeat }) => {
    Alert.alert(
      "Abandonner les modifications ?",
      "Votre brouillon n’a pas été enregistré.",
      [
        { text: "Continuer la saisie", style: "cancel" },
        {
          text: "Abandonner",
          style: "destructive",
          onPress: () => {
            discard();
            setDirty(false);
            repeat();
          },
        },
      ],
    );
  });
  return setDirty;
}
