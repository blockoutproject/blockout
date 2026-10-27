import { Alert } from "react-native";

/** Returns a displayed native action without accepting it; the scenario invokes it explicitly inside act. */
export function nativeAlertAction(label: string): () => void {
  const action = jest
    .mocked(Alert.alert)
    .mock.lastCall?.[2]?.find((button) => button.text === label)?.onPress;
  if (!action) throw new Error(`Missing native alert action: ${label}`);
  return () => action();
}
