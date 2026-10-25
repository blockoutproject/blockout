import { act, renderHook } from "@testing-library/react-native";
import { Alert, type AlertButton } from "react-native";
import { useActionConfirmation } from "../use-action-confirmation";

const question = {
  title: "Enregistrer ?",
  message: "Le brouillon sera enregistré.",
  confirmLabel: "Enregistrer",
};

beforeEach(() => jest.spyOn(Alert, "alert").mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

/** Reads the displayed native choice; the callback is the controlled platform boundary. */
function accept(): AlertButton {
  const button = jest
    .mocked(Alert.alert)
    .mock.lastCall?.[2]?.find(
      (choice) => choice.text === question.confirmLabel,
    );
  if (!button) throw new Error("Missing native confirmation");
  return button;
}

it("presents one question and accepts its result once despite repeated native callbacks", async () => {
  // Given
  const { result } = await renderHook(useActionConfirmation);
  const saved = jest.fn();

  // When
  const first = result.current(question).then((confirmed) => {
    if (confirmed) saved();
  });
  const concurrent = result.current(question);
  const choice = accept();
  await act(async () => {
    choice.onPress?.();
    choice.onPress?.();
    await first;
  });

  // Then
  expect(await concurrent).toBe(false);
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(saved).toHaveBeenCalledTimes(1);
});

it("declines a held question when its owner leaves", async () => {
  // Given
  const { result, unmount } = await renderHook(useActionConfirmation);
  const decision = result.current(question);
  const choice = accept();

  // When
  await unmount();
  choice.onPress?.();

  // Then
  expect(await decision).toBe(false);
});

it("keeps a new question independent of a cancelled dialog's retained callback", async () => {
  // Given
  const { result } = await renderHook(useActionConfirmation);
  const cancelled = result.current(question);
  const oldChoice = accept();
  jest.mocked(Alert.alert).mock.lastCall?.[3]?.onDismiss?.();
  expect(await cancelled).toBe(false);

  // When
  const current = result.current(question);
  oldChoice.onPress?.();
  jest.mocked(Alert.alert).mock.lastCall?.[3]?.onDismiss?.();

  // Then
  expect(await current).toBe(false);
});
