import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { AgeForm } from "../forms/age-form";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

/** Real form/theme; only the storage submission boundary is controlled. */
async function openForm(onSubmit = jest.fn().mockResolvedValue(undefined)) {
  await render(
    <ThemeProvider>
      <ActionFeedbackProvider scopeKey="test">
        <AgeForm pending={false} onSubmit={onSubmit} />
      </ActionFeedbackProvider>
    </ThemeProvider>,
  );
  return onSubmit;
}

it("starts without a declared age despite the native thumb position", async () => {
  // Given / When
  await openForm();

  // Then
  expect(screen.getByText("—")).toBeOnTheScreen();
  expect(
    screen.getByRole("adjustable", { name: "Âge en années révolues" }),
  ).toHaveAccessibilityValue({ text: "Aucun âge sélectionné" });
  expect(screen.getByRole("button", { name: "Continuer" })).toBeDisabled();
  expect(screen.queryByRole("textbox")).toBeNull();
});

it("requires confirmation after a precise plus/minus choice, including explicit zero", async () => {
  // Given
  const user = userEvent.setup();
  const submit = await openForm();

  // When
  await user.press(screen.getByRole("button", { name: "Augmenter l’âge" }));
  await user.press(screen.getByRole("button", { name: "Diminuer l’âge" }));

  // Then
  expect(screen.getByText("0")).toBeOnTheScreen();
  expect(submit).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Diminuer l’âge" })).toBeDisabled();

  // When
  await user.press(screen.getByRole("button", { name: "Continuer" }));

  // Then
  expect(submit).toHaveBeenCalledWith(0);
});

it("treats releasing the thumb at zero as explicit selection and displays 100+ at the upper bound", async () => {
  // Given
  const user = userEvent.setup();
  const submit = await openForm();
  const slider = screen.getByRole("adjustable", {
    name: "Âge en années révolues",
  });

  // When
  await fireEvent(slider, "onRNCSliderSlidingComplete", {
    nativeEvent: { value: 0 },
  });

  // Then
  expect(screen.getByRole("button", { name: "Continuer" })).toBeEnabled();

  // When
  await fireEvent(slider, "change", { nativeEvent: { value: 100 } });
  await user.press(screen.getByRole("button", { name: "Continuer" }));

  // Then
  expect(screen.getByText("100+")).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Augmenter l’âge" }),
  ).toBeDisabled();
  expect(submit).toHaveBeenCalledWith(100);
});

it("keeps the editable choice after rejected persistence and allows explicit retry", async () => {
  // Given
  const user = userEvent.setup();
  const write = Promise.withResolvers<void>();
  const submit = jest
    .fn()
    .mockReturnValueOnce(write.promise)
    .mockResolvedValue(undefined);
  await openForm(submit);
  await fireEvent(screen.getByRole("adjustable"), "change", {
    nativeEvent: { value: 16 },
  });

  // When
  await user.press(screen.getByRole("button", { name: "Continuer" }));

  // Then
  expect(submit).toHaveBeenCalledTimes(1);

  // When
  await act(async () => write.reject(new Error("Storage")));

  // Then
  expect(
    await screen.findByText(
      "Votre choix n’a pas pu être enregistré. Réessayez.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByText("16")).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Continuer" }));

  // Then
  expect(submit).toHaveBeenCalledTimes(2);
});

it("cancels an edited correction on unmount and starts a fresh neutral choice when reopened", async () => {
  // Given
  const submit = jest.fn().mockResolvedValue(undefined);
  const view = await render(
    <ThemeProvider>
      <ActionFeedbackProvider scopeKey="test">
        <AgeForm pending={false} onSubmit={submit} />
      </ActionFeedbackProvider>
    </ThemeProvider>,
  );
  await fireEvent(screen.getByRole("adjustable"), "change", {
    nativeEvent: { value: 17 },
  });

  // When
  await view.unmount();
  await openForm(submit);

  // Then
  expect(submit).not.toHaveBeenCalled();
  expect(screen.getByText("—")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Continuer" })).toBeDisabled();
});
