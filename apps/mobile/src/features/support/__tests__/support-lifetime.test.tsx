import { act, cleanup, screen, userEvent } from "@testing-library/react-native";
import { renderRouter } from "expo-router/testing-library";
import { Stack, router } from "expo-router";
import { Alert, Text } from "react-native";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { nativeAlertAction } from "../../../shared/native/test-support/native-alert";
import { SupportVisitProvider } from "../forms/support-visit";
import { SupportForm } from "../forms/support-form";
import {
  picker,
  files,
  pickedImage,
  resetNativeImages,
} from "../test-support/native-images";

jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
jest.mock(
  "expo-image-picker",
  () => jest.requireActual("../test-support/native-images").picker,
);
jest.mock(
  "expo-image-manipulator",
  () => jest.requireActual("../test-support/native-images").manipulator,
);
jest.mock(
  "expo-file-system",
  () => jest.requireActual("../test-support/native-images").nativeFileSystem,
);

beforeEach(() => {
  jest.useFakeTimers();
  resetNativeImages();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});
afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

/** Uses actual nested route removal; native Alert and submission are the only controlled actions. */
async function openJourney(submit = jest.fn().mockResolvedValue(undefined)) {
  await renderRouter(
    {
      _layout: () => <Stack />,
      index: () => <Text>Accueil</Text>,
      "support/_layout": () => (
        <SupportVisitProvider context={{}} replyEmail="reply@example.invalid">
          <Stack />
        </SupportVisitProvider>
      ),
      "support/index": () => <SupportForm onSubmit={submit} />,
    },
    {
      initialUrl: "/",
      wrapper: ({ children }) => (
        <ThemeProvider>
          <ActionFeedbackProvider scopeKey="visit">
            {children}
          </ActionFeedbackProvider>
        </ThemeProvider>
      ),
    },
  );
  await act(() => router.push("/support"));
  await screen.findByLabelText("Titre");
  return userEvent.setup();
}

it("retains text through a canceled picker and asks locally before abandoning the populated visit", async () => {
  // Given
  const user = await openJourney();
  await user.type(screen.getByLabelText("Titre"), "Brouillon fictif");

  // When
  await user.press(screen.getByRole("button", { name: "Ajouter des images" }));
  await act(() => router.back());

  // Then
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  await act(() => nativeAlertAction("Continuer la saisie")());
  expect(screen.getByDisplayValue("Brouillon fictif")).toBeOnTheScreen();

  // When
  await act(() => router.back());
  await act(() => nativeAlertAction("Abandonner")());
  await screen.findByText("Accueil");
  await act(() => router.push("/support"));

  // Then
  expect(await screen.findByLabelText("Titre")).toHaveDisplayValue("");
  expect(screen.queryByText("Demande reçue")).toBeNull();
});

it("guards an image-only draft and releases its prepared files on explicit abandonment", async () => {
  // Given
  const user = await openJourney();
  picker.launchImageLibraryAsync.mockResolvedValueOnce({
    canceled: false,
    assets: [pickedImage()],
  });
  await user.press(screen.getByRole("button", { name: "Ajouter des images" }));
  const prepared = [...files.values()][0];

  // When
  await act(() => router.back());

  // Then
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  await act(() => nativeAlertAction("Abandonner")());
  expect(await screen.findByText("Accueil")).toBeOnTheScreen();
  expect(prepared.exists).toBe(false);
});

it("leaves an in-flight request without claiming cancellation or restoring its late receipt", async () => {
  // Given
  let finish!: () => void;
  const submit = jest.fn(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
  );
  const user = await openJourney(submit);
  await user.type(screen.getByLabelText("Titre"), "Envoi fictif");
  await user.type(screen.getByLabelText("Description"), "Description fictive");
  await user.press(screen.getByRole("button", { name: "Envoyer la demande" }));

  // When
  await act(() => router.back());

  // Then
  expect(Alert.alert).toHaveBeenLastCalledWith(
    "Quitter pendant l’envoi ?",
    expect.stringMatching(/ne garantit pas l’annulation/i),
    expect.any(Array),
    expect.any(Object),
  );
  await act(() => nativeAlertAction("Quitter")());
  await screen.findByText("Accueil");
  await act(() => router.push("/support"));
  await act(() => finish());
  expect(await screen.findByLabelText("Titre")).toHaveDisplayValue("");
  expect(screen.queryByText("Demande reçue")).toBeNull();
});
