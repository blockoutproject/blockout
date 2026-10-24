import { usePreventRemove } from "expo-router";
import { Alert } from "react-native";

/** Confirms removal using the caller's dirty state; discard must clear that state before navigation repeats. */
export function usePreparationDiscard(dirty: boolean, discard: () => void) {
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
            repeat();
          },
        },
      ],
    );
  });
}
