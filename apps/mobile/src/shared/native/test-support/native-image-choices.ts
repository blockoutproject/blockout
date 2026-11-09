import { ActionSheetIOS, Alert, Platform } from "react-native";
import { nativeAlertAction } from "./native-alert";

/** Returns the choices sent to the current platform's native API without simulating an application menu. */
export function nativeImageChoiceLabels(): string[] {
  if (Platform.OS === "ios") {
    return (
      jest.mocked(ActionSheetIOS.showActionSheetWithOptions).mock.lastCall?.[0]
        .options ?? []
    );
  }
  return (jest.mocked(Alert.alert).mock.lastCall?.[2] ?? []).flatMap(
    (button) => (button.text ? [button.text] : []),
  );
}

/** Captures one displayed native callback; the scenario invokes it explicitly inside act, including after authority changes. */
export function nativeImageChoiceAction(label: string): () => void {
  if (Platform.OS !== "ios") {
    return nativeAlertAction(label);
  }
  const request = jest.mocked(ActionSheetIOS.showActionSheetWithOptions).mock
    .lastCall;
  const index = request?.[0].options.indexOf(label) ?? -1;
  if (!request || index < 0) {
    throw new Error(`Missing native image choice: ${label}`);
  }
  return () => request[1](index);
}
