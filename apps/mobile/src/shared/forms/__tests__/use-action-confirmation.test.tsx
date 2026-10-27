import { nativeAlertAction } from "../../native/test-support/native-alert";
import { cleanup, act, renderHook } from "@testing-library/react-native";
import { Alert } from "react-native";
import { useActionConfirmation } from "../use-action-confirmation";

const question = {
  title: "Enregistrer ?",
  message: "Le brouillon sera enregistré.",
  confirmLabel: "Enregistrer",
};

beforeEach(() => jest.spyOn(Alert, "alert").mockImplementation(() => {}));
afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

it("presents one question and accepts its result once despite repeated native callbacks", async () => {
  // Given
  const { result } = await renderHook(useActionConfirmation);

  // When
  const first = result.current(question);
  const concurrent = result.current(question);
  const choice = nativeAlertAction(question.confirmLabel);
  await act(async () => {
    choice();
    choice();
    await first;
  });

  // Then
  expect(await concurrent).toBe(false);
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  await expect(first).resolves.toBe(true);
  expect(Alert.alert).toHaveBeenCalledWith(
    question.title,
    question.message,
    [
      { text: "Annuler", style: "cancel", onPress: expect.any(Function) },
      {
        text: question.confirmLabel,
        style: "default",
        onPress: expect.any(Function),
      },
    ],
    { cancelable: true, onDismiss: expect.any(Function) },
  );
});

it("declines a held question when its owner leaves", async () => {
  // Given
  const { result, unmount } = await renderHook(useActionConfirmation);
  const decision = result.current(question);
  const choice = nativeAlertAction(question.confirmLabel);

  // When
  await unmount();
  choice();

  // Then
  expect(await decision).toBe(false);
});

it("keeps a new question independent of a cancelled dialog's retained callback", async () => {
  // Given
  const { result } = await renderHook(useActionConfirmation);
  const cancelled = result.current(question);
  const oldChoice = nativeAlertAction(question.confirmLabel);
  jest.mocked(Alert.alert).mock.lastCall?.[3]?.onDismiss?.();
  expect(await cancelled).toBe(false);

  // When
  const current = result.current(question);
  oldChoice();
  jest.mocked(Alert.alert).mock.lastCall?.[3]?.onDismiss?.();

  // Then
  expect(await current).toBe(false);
});
