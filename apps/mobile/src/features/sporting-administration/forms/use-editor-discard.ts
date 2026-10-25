import { usePreventRemove } from "expo-router";
import { Alert } from "react-native";
/** Uses the installed router's removal guard; only explicit discard releases the original-session draft. */
export function useEditorDiscard(dirty: boolean, discard: () => void) {
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
            discard();
            repeat();
          },
        },
      ],
    ),
  );
}
