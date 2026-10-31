import {
  render,
  screen,
  userEvent,
  cleanup,
  act,
} from "@testing-library/react-native";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { TECHNICAL_ERROR } from "../../../shared/components/error-copy";
import { SupportVisitProvider } from "../forms/support-visit";
import { SupportForm } from "../forms/support-form";
import {
  files,
  picker,
  manipulation,
  manipulator,
  renderedImage,
  pickedImage,
  preparedImage,
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
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  usePreventRemove: jest.fn(),
  useRouter: () => ({ push: jest.fn() }),
}));

beforeEach(() => {
  jest.useFakeTimers();
  resetNativeImages();
});
afterEach(async () => {
  await cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
});

/** Mounts real RHF and shared image controls; only native media and the send boundary are controlled. */
async function openForm() {
  const submit = jest.fn().mockResolvedValue(undefined);
  await render(
    <ThemeProvider>
      <ActionFeedbackProvider scopeKey="images">
        <SupportVisitProvider context={{}} replyEmail="reply@example.invalid">
          <SupportForm onSubmit={submit} />
        </SupportVisitProvider>
      </ActionFeedbackProvider>
    </ThemeProvider>,
  );
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Titre"), "Texte conservé");
  await user.type(screen.getByLabelText("Description"), "Description fictive");
  return { user, submit };
}

it("prepares five images without square crop, previews them and rejects a sixth without losing text", async () => {
  // Given
  const { user } = await openForm();
  picker.launchImageLibraryAsync.mockResolvedValueOnce({
    canceled: false,
    assets: Array.from({ length: 5 }, (_, i) => pickedImage(i)),
  });

  // When
  await user.press(screen.getByRole("button", { name: "Ajouter des images" }));

  // Then
  expect(
    await screen.findAllByRole("button", { name: /Aperçu : Image/ }),
  ).toHaveLength(5);
  expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(
    expect.objectContaining({
      allowsMultipleSelection: true,
      allowsEditing: false,
      selectionLimit: 5,
    }),
  );
  expect(manipulator.ImageManipulator.manipulate).toHaveBeenCalledTimes(5);
  expect(manipulator.ImageManipulator.manipulate).toHaveBeenCalledWith(
    pickedImage(0).uri,
    { maxWidth: 2560, maxHeight: 2560 },
  );
  await user.press(screen.getByRole("button", { name: "Aperçu : Image 1" }));
  expect(
    await screen.findByRole("image", { name: "Image 1" }),
  ).toBeOnTheScreen();
  await user.press(screen.getByRole("button", { name: "Fermer" }));
  await user.press(screen.getByRole("button", { name: "Ajouter des images" }));
  expect(
    await screen.findByText("Vous pouvez joindre cinq images maximum."),
  ).toBeOnTheScreen();
  expect(picker.launchImageLibraryAsync).toHaveBeenCalledTimes(1);
  expect(screen.getByDisplayValue("Texte conservé")).toBeOnTheScreen();
});

it("refuses an over-capacity picker result before preparing any image and preserves the existing selection", async () => {
  // Given
  const { user } = await openForm();
  picker.launchImageLibraryAsync.mockResolvedValueOnce({
    canceled: false,
    assets: [pickedImage()],
  });
  await user.press(screen.getByRole("button", { name: "Ajouter des images" }));
  picker.launchImageLibraryAsync.mockResolvedValueOnce({
    canceled: false,
    assets: Array.from({ length: 5 }, (_, i) => pickedImage(i)),
  });

  // When
  await user.press(screen.getByRole("button", { name: "Ajouter des images" }));

  // Then
  expect(
    await screen.findByText("Vous pouvez joindre cinq images maximum."),
  ).toBeOnTheScreen();
  expect(
    screen.getAllByRole("button", { name: /Aperçu : Image/ }),
  ).toHaveLength(1);
  expect(manipulator.ImageManipulator.manipulate).toHaveBeenCalledTimes(1);
  expect(screen.getByDisplayValue("Texte conservé")).toBeOnTheScreen();
});

it.each(["image/png", "image/heic"])(
  "encodes %s with the native PNG/JPEG save format exactly once",
  async (mimeType) => {
    // Given
    const { user } = await openForm();
    picker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [{ ...pickedImage(), mimeType }],
    });

    // When
    await user.press(
      screen.getByRole("button", { name: "Ajouter des images" }),
    );

    // Then
    expect(renderedImage.saveAsync).toHaveBeenCalledTimes(1);
    expect(renderedImage.saveAsync).toHaveBeenCalledWith({
      format: mimeType === "image/png" ? "png" : "jpeg",
      compress: 0.9,
    });
    expect(
      screen.getByRole("button", { name: "Envoyer la demande" }),
    ).toBeEnabled();
  },
);

it.each([5242881, 0])(
  "keeps a refused %i-byte selection until explicit replacement or removal",
  async (size) => {
    // Given
    const { user, submit } = await openForm();
    picker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [pickedImage(1), pickedImage(2)],
    });
    preparedImage("file:///cache/rejected.png", size);
    renderedImage.saveAsync
      .mockResolvedValueOnce({ uri: "file:///cache/valid.png" })
      .mockResolvedValueOnce({ uri: "file:///cache/rejected.png" });

    // When
    await user.press(
      screen.getByRole("button", { name: "Ajouter des images" }),
    );

    // Then
    expect(
      await screen.findByText(/Image 2.*remplacez.*supprimez/i),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Envoyer la demande" }),
    ).toBeDisabled();
    expect(submit).not.toHaveBeenCalled();
    expect(files.get("file:///cache/rejected.png")?.delete).toHaveBeenCalled();
    expect(screen.getByDisplayValue("Texte conservé")).toBeOnTheScreen();

    // When
    picker.launchImageLibraryAsync.mockResolvedValueOnce({
      canceled: false,
      assets: [pickedImage(3)],
    });
    await user.press(
      screen.getByRole("button", { name: /Changer l’image : Image 2/ }),
    );

    // Then
    expect(
      screen.getByRole("button", { name: "Envoyer la demande" }),
    ).toBeEnabled();
    expect(
      screen.getAllByRole("button", { name: /Aperçu : Image/ }),
    ).toHaveLength(2);
    expect(picker.launchImageLibraryAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        allowsMultipleSelection: false,
        allowsEditing: false,
      }),
    );
  },
);

it("retains text on denied photo access and keeps corrupt selections explicitly removable", async () => {
  // Given
  const { user } = await openForm();
  picker.launchImageLibraryAsync.mockRejectedValueOnce(
    new Error("Synthetic permission denial"),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Ajouter des images" }));

  // Then
  expect(await screen.findByText(TECHNICAL_ERROR)).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Texte conservé")).toBeOnTheScreen();

  // When
  picker.launchImageLibraryAsync.mockResolvedValueOnce({
    canceled: false,
    assets: [pickedImage()],
  });
  manipulation.renderAsync.mockRejectedValueOnce(
    new Error("Synthetic corrupt image"),
  );
  await user.press(screen.getByRole("button", { name: "Ajouter des images" }));

  // Then
  expect(
    await screen.findByText(/Image 1.*remplacez.*supprimez/i),
  ).toBeOnTheScreen();
  await user.press(
    screen.getByRole("button", { name: /Supprimer l’image : Image 1/ }),
  );
  expect(
    screen.getByRole("button", { name: "Envoyer la demande" }),
  ).toBeEnabled();
});

it("blocks sending during preparation and ignores a late output after the visit is replaced", async () => {
  // Given
  const { user, submit } = await openForm();
  let finish!: (value: { uri: string }) => void;
  picker.launchImageLibraryAsync.mockResolvedValueOnce({
    canceled: false,
    assets: [pickedImage()],
  });
  renderedImage.saveAsync.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );

  // When
  await user.press(screen.getByRole("button", { name: "Ajouter des images" }));

  // Then
  expect(
    screen.getByRole("button", { name: "Envoyer la demande" }),
  ).toBeDisabled();
  expect(submit).not.toHaveBeenCalled();
  await cleanup();
  await openForm();
  const old = preparedImage("file:///cache/old.png");
  await act(async () => finish({ uri: old.uri }));
  expect(old.delete).toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: /Aperçu : Image/ })).toBeNull();
});
