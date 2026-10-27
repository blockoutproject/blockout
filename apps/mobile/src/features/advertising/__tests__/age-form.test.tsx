import type { PropsWithChildren } from "react";
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

// The schema imports the age persistence owner; only its native storage dependency is doubled.
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

/** Supplies only the theme and feedback owners required by the real age form. */
function AgeFormProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <ActionFeedbackProvider scopeKey="test">
        {children}
      </ActionFeedbackProvider>
    </ThemeProvider>
  );
}

it("starts without a declared age despite the native thumb position", async () => {
  // Given
  const submit = jest.fn().mockResolvedValue(undefined);

  // When
  await render(<AgeForm pending={false} onSubmit={submit} />, {
    wrapper: AgeFormProviders,
  });

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
  const submit = jest.fn().mockResolvedValue(undefined);
  await render(<AgeForm pending={false} onSubmit={submit} />, {
    wrapper: AgeFormProviders,
  });

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
  const submit = jest.fn().mockResolvedValue(undefined);
  await render(<AgeForm pending={false} onSubmit={submit} />, {
    wrapper: AgeFormProviders,
  });
  const slider = screen.getByRole("adjustable", {
    name: "Âge en années révolues",
  });

  // When
  // userEvent has no slider gesture; deliver the native completion event.
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
  await render(<AgeForm pending={false} onSubmit={submit} />, {
    wrapper: AgeFormProviders,
  });
  await fireEvent(screen.getByRole("adjustable"), "change", {
    nativeEvent: { value: 16 },
  });

  // When
  await user.press(screen.getByRole("button", { name: "Continuer" }));

  // Then
  expect(submit.mock.calls).toEqual([[16]]);

  // When
  await act(async () => write.reject(new Error("Storage")));

  // Then
  expect(
    await screen.findByText(
      "Une erreur est survenue. Veuillez réessayer plus tard.",
    ),
  ).toBeOnTheScreen();
  expect(screen.getByText("16")).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Continuer" }));

  // Then
  expect(submit.mock.calls).toEqual([[16], [16]]);
});

it("cancels an edited correction on unmount and starts a fresh neutral choice when reopened", async () => {
  // Given
  const submit = jest.fn().mockResolvedValue(undefined);
  const view = await render(<AgeForm pending={false} onSubmit={submit} />, {
    wrapper: AgeFormProviders,
  });
  await fireEvent(screen.getByRole("adjustable"), "change", {
    nativeEvent: { value: 17 },
  });

  // When
  await view.unmount();
  await render(<AgeForm pending={false} onSubmit={submit} />, {
    wrapper: AgeFormProviders,
  });

  // Then
  expect(submit).not.toHaveBeenCalled();
  expect(screen.getByText("—")).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Continuer" })).toBeDisabled();
});
