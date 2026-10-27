import { ActionFeedbackProvider } from "../action-feedback";
import { TECHNICAL_ERROR, TECHNICAL_ERROR_TITLE } from "../error-copy";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  userEvent,
} from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { useState, type PropsWithChildren } from "react";
import { ThemeProvider } from "../../theme/theme-provider";
import {
  ImageField as ImageFieldControl,
  type ImageFieldProps,
} from "../image-field";
import {
  useImageSelection,
  type ImageSelectionOptions,
} from "../../images/use-image-selection";

jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock("expo-file-system", () => ({
  File: jest.fn((uri: string) => ({
    uri,
    get exists() {
      return !mockDeletedFiles.has(uri);
    },
    delete: () => {
      mockDeletedFiles.add(uri);
      mockDeleteFile(uri);
    },
  })),
  Paths: {
    cache: { uri: "file:///cache/" },
    normalize: jest.requireActual("expo-file-system").Paths.normalize,
  },
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));
// Separate File handles observe the same native path after deletion.
const mockDeletedFiles = new Set<string>();
const mockDeleteFile = jest.fn<void, [string]>();
const launch = jest.mocked(ImagePicker.launchImageLibraryAsync);
const logo = {
  id: "club-logo",
  uri: "file:///logo.png",
  label: "Logo du club",
};
const photo: ImagePicker.ImagePickerAsset = {
  uri: "file:///cache/ImagePicker/selection.jpg",
  width: 1200,
  height: 800,
  mimeType: "image/jpeg",
  fileSize: 2048,
};

/** Test host composes the real selection owner and controlled field; only native I/O is doubled. */
function ImageField({
  onSelect,
  canSelect,
  multiple,
  selectionLimit,
  allowsEditing,
  aspect,
  ...props
}: Omit<ImageFieldProps, "selection"> & ImageSelectionOptions) {
  const selection = useImageSelection({
    onSelect,
    canSelect,
    multiple,
    selectionLimit,
    allowsEditing,
    aspect,
  });
  return (
    <ImageFieldControl {...props} multiple={multiple} selection={selection} />
  );
}

/** Mounts only the image control's required providers; each scenario supplies its native results and callbacks. */
function renderField(
  props: Partial<Omit<ImageFieldProps, "selection">> & ImageSelectionOptions,
) {
  return render(
    <MediaProviders>
      <ImageField label="Logo" images={[]} {...props} />
    </MediaProviders>,
  );
}

beforeEach(() => {
  mockDeletedFiles.clear();
  launch.mockReset();
  mockDeleteFile.mockReset();
});

it("keeps image selection explicit after validation instead of promising a retry", async () => {
  // Given
  launch.mockResolvedValue({ canceled: true, assets: null });
  const user = userEvent.setup();
  const onSelect = jest.fn();
  await renderField({
    onSelect,
    error:
      "Cette image ne peut pas être enregistrée. Choisissez une autre image.",
  });

  // When
  await user.press(screen.getByRole("button", { name: "Choisir une image" }));

  // Then
  expect(launch).toHaveBeenCalledTimes(1);
  expect(onSelect).not.toHaveBeenCalled();
  expect(
    screen.queryByRole("button", { name: "Réessayer" }),
  ).not.toBeOnTheScreen();
});

it("loans native image copies without imposing cropping and releases them after acceptance", async () => {
  // Given
  launch.mockResolvedValue({ canceled: false, assets: [photo] });
  const user = userEvent.setup();
  const onSelect = jest.fn();
  await renderField({ onSelect });

  // When
  await user.press(screen.getByRole("button", { name: "Choisir une image" }));

  // Then
  expect(launch).toHaveBeenCalledWith(
    expect.objectContaining({
      mediaTypes: ["images"],
      allowsEditing: false,
      allowsMultipleSelection: false,
    }),
  );
  expect(onSelect).toHaveBeenCalledWith([photo], undefined);
  expect(mockDeleteFile).toHaveBeenCalledWith(photo.uri);
  expect(
    screen.queryByRole("button", { name: "Aperçu : Logo du club" }),
  ).not.toBeOnTheScreen();
});

it.each([
  {
    operation: "addition",
    images: [],
    action: "Choisir une image",
    replaceId: undefined,
  },
  {
    operation: "replacement",
    images: [logo],
    action: "Changer l’image : Logo du club",
    replaceId: logo.id,
  },
])(
  "forwards caller-owned native cropping for $operation",
  async ({ images, action, replaceId }) => {
    // Given
    const cropped = { ...photo, width: 800, height: 800 };
    launch.mockResolvedValue({ canceled: false, assets: [cropped] });
    const user = userEvent.setup();
    const onSelect = jest.fn();
    await renderField({
      onSelect,
      images,
      allowsEditing: true,
      aspect: [1, 1],
    });

    // When
    await user.press(screen.getByRole("button", { name: action }));

    // Then
    expect(launch).toHaveBeenCalledWith(
      expect.objectContaining({
        allowsEditing: true,
        aspect: [1, 1],
        allowsMultipleSelection: false,
        selectionLimit: 1,
      }),
    );
    expect(onSelect).toHaveBeenCalledWith([cropped], replaceId);
  },
);

it("opens one native picker when selection is requested twice before a render", async () => {
  // Given — the public selection owner must also reject duplicate native dispatch without a field rerender.
  const picker = Promise.withResolvers<ImagePicker.ImagePickerResult>();
  launch.mockReturnValue(picker.promise);
  const onSelect = jest.fn();
  const { result } = await renderHook(() => useImageSelection({ onSelect }), {
    wrapper: MediaProviders,
  });

  // When
  await act(async () => {
    result.current.select();
    result.current.select();
  });

  // Then
  expect(launch).toHaveBeenCalledTimes(1);
  expect(result.current.pending).toBe(true);
  // When
  await act(async () => picker.resolve({ canceled: false, assets: [photo] }));

  // Then
  expect(onSelect).toHaveBeenCalledWith([photo], undefined);
  expect(mockDeleteFile).toHaveBeenCalledWith(photo.uri);
  expect(result.current.pending).toBe(false);
});

it("respects the caller's selection admission and allows a later explicit attempt", async () => {
  // Given
  launch.mockResolvedValue({ canceled: false, assets: [photo] });
  const onSelect = jest.fn();
  const view = await renderHook(
    ({ admitted }: { admitted: boolean }) =>
      useImageSelection({ canSelect: () => admitted, onSelect }),
    { wrapper: MediaProviders, initialProps: { admitted: false } },
  );

  // When
  await act(() => view.result.current.select());

  // Then
  expect(launch).not.toHaveBeenCalled();
  expect(onSelect).not.toHaveBeenCalled();

  // When
  await view.rerender({ admitted: true });
  await act(() => view.result.current.select());

  // Then
  expect(launch).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledWith([photo], undefined);
});

it("preserves the existing image when native selection is cancelled", async () => {
  // Given
  launch.mockResolvedValue({ canceled: true, assets: null });
  const user = userEvent.setup();
  const onSelect = jest.fn();
  const onRemove = jest.fn();
  await renderField({
    onSelect,
    onRemove,
    images: [logo],
    allowsEditing: true,
    aspect: [1, 1],
  });

  // When
  await user.press(
    screen.getByRole("button", { name: "Changer l’image : Logo du club" }),
  );

  // Then
  expect(onSelect).not.toHaveBeenCalled();
  expect(onRemove).not.toHaveBeenCalled();
  expect(mockDeleteFile).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Aperçu : Logo du club" }),
  ).toBeOnTheScreen();
});

it.each(["ERR_USER_REJECTED_PERMISSIONS", "ERR_TEST_PICKER"])(
  "keeps selection usable after native refusal/failure %s without disclosing provider text",
  async (code) => {
    // Given
    launch.mockRejectedValueOnce(
      Object.assign(new Error("private path/provider detail"), { code }),
    );
    const user = userEvent.setup();
    const onSelect = jest.fn();
    await renderField({ onSelect, images: [logo] });

    // When
    await user.press(
      screen.getByRole("button", { name: "Changer l’image : Logo du club" }),
    );

    // Then
    expect(await screen.findByRole("alert")).toHaveTextContent(TECHNICAL_ERROR);
    expect(screen.queryByText(/private path/)).not.toBeOnTheScreen();
    expect(onSelect).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", {
        name: "Changer l’image : Logo du club",
        disabled: false,
      }),
    ).toBeOnTheScreen();
  },
);

it("opens a full-screen preview and closes it without changing caller values", async () => {
  // Given
  const user = userEvent.setup();
  const onSelect = jest.fn();
  const onRemove = jest.fn();
  await renderField({ onSelect, onRemove, images: [logo] });

  // When
  await user.press(
    screen.getByRole("button", { name: "Aperçu : Logo du club" }),
  );
  expect(screen.getByRole("image", { name: "Logo du club" })).toBeOnTheScreen();
  await user.press(screen.getByRole("button", { name: "Fermer" }));

  // Then
  expect(
    screen.queryByRole("image", { name: "Logo du club" }),
  ).not.toBeOnTheScreen();
  expect(onSelect).not.toHaveBeenCalled();
  expect(onRemove).not.toHaveBeenCalled();
});

it("replaces a specific image and delegates automatic-logo restoration meaning", async () => {
  // Given
  launch.mockResolvedValue({ canceled: false, assets: [photo] });
  const user = userEvent.setup();
  const onSelect = jest.fn();
  const onRemove = jest.fn();
  await renderField({
    onSelect,
    onRemove,
    images: [logo],
    removeLabel: "Rétablir le logo automatique",
  });

  // When
  await user.press(
    screen.getByRole("button", { name: "Changer l’image : Logo du club" }),
  );
  await user.press(
    screen.getByRole("button", {
      name: "Rétablir le logo automatique : Logo du club",
    }),
  );

  // Then
  expect(onSelect).toHaveBeenCalledWith([photo], logo.id);
  expect(onRemove).toHaveBeenCalledWith(logo.id);
  expect(
    screen.getByRole("button", { name: "Aperçu : Logo du club" }),
  ).toBeOnTheScreen();
});

it("prioritizes multiple additions over native cropping but allows cropping a single replacement", async () => {
  // Given
  const replacement = {
    ...photo,
    uri: "file:///cache/ImagePicker/replacement.jpg",
  };
  launch
    .mockResolvedValueOnce({ canceled: false, assets: [photo] })
    .mockResolvedValueOnce({ canceled: false, assets: [replacement] });
  const user = userEvent.setup();
  await renderField({
    onSelect: jest.fn(),
    images: [logo],
    multiple: true,
    selectionLimit: 4,
    allowsEditing: true,
    aspect: [1, 1],
    chooseLabel: "Ajouter des captures",
  });

  // When
  await user.press(
    screen.getByRole("button", { name: "Ajouter des captures" }),
  );

  // Then
  expect(launch).toHaveBeenLastCalledWith(
    expect.objectContaining({
      allowsMultipleSelection: true,
      allowsEditing: false,
      selectionLimit: 4,
    }),
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Changer l’image : Logo du club" }),
  );

  // Then
  expect(launch).toHaveBeenLastCalledWith(
    expect.objectContaining({
      allowsMultipleSelection: false,
      allowsEditing: true,
      aspect: [1, 1],
      selectionLimit: 1,
    }),
  );
});

it("preserves the controlled image when its owner supplies a validation error", async () => {
  // Given
  const onSelect = jest.fn();
  const view = await render(
    <ImageField label="Pièces jointes" images={[logo]} onSelect={onSelect} />,
    { wrapper: MediaProviders },
  );

  // When
  await view.rerender(
    <ImageField
      label="Pièces jointes"
      images={[logo]}
      onSelect={onSelect}
      error="PNG/JPEG, 5 Mio maximum après préparation."
    />,
  );

  // Then
  expect(screen.getByRole("alert")).toHaveTextContent(
    "PNG/JPEG, 5 Mio maximum après préparation.",
  );
  expect(
    screen.getByRole("button", { name: "Aperçu : Logo du club" }),
  ).toBeOnTheScreen();
  expect(onSelect).not.toHaveBeenCalled();
});

it("blocks reselection during owner preparation and recovers safely from rejection", async () => {
  // Given
  launch.mockResolvedValue({ canceled: false, assets: [photo] });
  const preparation = Promise.withResolvers<void>();
  const onSelect = jest.fn(() => preparation.promise);
  const onRemove = jest.fn();
  const user = userEvent.setup();
  await renderField({ images: [logo], onSelect, onRemove });

  // When
  await user.press(
    screen.getByRole("button", { name: "Changer l’image : Logo du club" }),
  );

  // Then
  expect(
    screen.getByRole("button", {
      name: "Changer l’image : Logo du club",
      busy: true,
      disabled: true,
    }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", {
      name: "Supprimer l’image : Logo du club",
      disabled: true,
    }),
  ).toBeOnTheScreen();

  // When
  await user.press(
    screen.getByRole("button", {
      name: "Changer l’image : Logo du club",
      disabled: true,
    }),
  );

  // Then
  expect(launch).toHaveBeenCalledTimes(1);
  expect(onSelect).toHaveBeenCalledTimes(1);
  expect(mockDeleteFile).not.toHaveBeenCalled();

  // When
  await act(async () => {
    preparation.reject(new Error("private URI"));
  });

  // Then
  expect(await screen.findByRole("alert")).toHaveTextContent(TECHNICAL_ERROR);
  expect(mockDeleteFile).toHaveBeenCalledWith(photo.uri);
  expect(
    screen.getByRole("button", {
      name: "Changer l’image : Logo du club",
      disabled: false,
    }),
  ).toBeOnTheScreen();
});

it("prevents all image actions when the caller disables the field", async () => {
  // Given
  const user = userEvent.setup();
  const onRemove = jest.fn();
  await renderField({
    onSelect: jest.fn(),
    onRemove,
    images: [logo],
    disabled: true,
  });

  // When
  await user.press(
    screen.getByRole("button", {
      name: "Changer l’image : Logo du club",
      disabled: true,
    }),
  );
  await user.press(
    screen.getByRole("button", {
      name: "Supprimer l’image : Logo du club",
      disabled: true,
    }),
  );

  // Then
  expect(launch).not.toHaveBeenCalled();
  expect(onRemove).not.toHaveBeenCalled();
});

it("ignores a native selection returned after the field unmounts", async () => {
  // Given
  const picker = Promise.withResolvers<ImagePicker.ImagePickerResult>();
  launch.mockReturnValue(picker.promise);
  const user = userEvent.setup();
  const onSelect = jest.fn();
  await renderField({ onSelect });

  // When
  await user.press(screen.getByRole("button", { name: "Choisir une image" }));
  await screen.unmount();
  await act(async () => {
    picker.resolve({ canceled: false, assets: [photo] });
  });

  // Then
  expect(onSelect).not.toHaveBeenCalled();
  expect(mockDeleteFile).toHaveBeenCalledWith(photo.uri);
});

it("shows accepted caller values and removes them only when the owner updates", async () => {
  // Given
  launch.mockResolvedValue({ canceled: false, assets: [photo] });
  /** Local controlled fixture, without upload or business persistence. */
  function Owner() {
    const [images, setImages] = useState([logo]);
    return (
      <MediaProviders>
        <ImageField
          label="Logo"
          images={images}
          onSelect={() =>
            setImages([
              {
                id: "replacement",
                uri: "data:image/jpeg;base64,cHJldmlldw==",
                label: "Nouveau logo",
              },
            ])
          }
          onRemove={(id) =>
            setImages((current) => current.filter((image) => image.id !== id))
          }
        />
      </MediaProviders>
    );
  }
  const user = userEvent.setup();
  await render(<Owner />);

  // When
  await user.press(
    screen.getByRole("button", { name: "Changer l’image : Logo du club" }),
  );

  // Then
  expect(
    screen.getByRole("button", { name: "Aperçu : Nouveau logo" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Aperçu : Logo du club" }),
  ).not.toBeOnTheScreen();

  // When
  await user.press(
    screen.getByRole("button", { name: "Supprimer l’image : Nouveau logo" }),
  );

  // Then
  expect(
    screen.getByRole("button", { name: "Choisir une image" }),
  ).toBeOnTheScreen();
});

it("keeps preview dismissal available when native image decoding fails", async () => {
  // Given
  const user = userEvent.setup();
  const onSelect = jest.fn();
  const onRemove = jest.fn();
  await renderField({ onSelect, onRemove, images: [logo] });
  await user.press(
    screen.getByRole("button", { name: "Aperçu : Logo du club" }),
  );

  // When
  await fireEvent(
    screen.getByRole("image", { name: "Logo du club" }),
    "error",
    {
      nativeEvent: { error: "private file path" },
    },
  );

  // Then
  expect(await screen.findByRole("alert")).toHaveTextContent(
    TECHNICAL_ERROR_TITLE,
  );
  expect(screen.getByRole("button", { name: "Fermer" })).toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Réessayer" })).toBeOnTheScreen();

  // When
  await user.press(screen.getByRole("button", { name: "Réessayer" }));

  // Then
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  expect(screen.getByRole("image", { name: "Logo du club" })).toBeOnTheScreen();
  expect(screen.queryByText(/private file path/)).not.toBeOnTheScreen();
  expect(onSelect).not.toHaveBeenCalled();
  expect(onRemove).not.toHaveBeenCalled();
});

it("starts a new preview attempt when an image URI returns or the viewer reopens", async () => {
  // Given
  const user = userEvent.setup();
  const onSelect = jest.fn();
  const view = await render(
    <ImageField images={[logo]} onSelect={onSelect} />,
    { wrapper: MediaProviders },
  );
  await user.press(
    screen.getByRole("button", { name: "Aperçu : Logo du club" }),
  );
  await fireEvent(
    screen.getByRole("image", { name: "Logo du club" }),
    "error",
    { nativeEvent: { error: "Native decoding failed" } },
  );
  expect(screen.getByText(TECHNICAL_ERROR_TITLE)).toBeOnTheScreen();

  // When
  await view.rerender(
    <ImageField
      images={[{ ...logo, uri: "file:///replacement.png" }]}
      onSelect={onSelect}
    />,
  );

  // Then
  expect(screen.queryByText(TECHNICAL_ERROR_TITLE)).not.toBeOnTheScreen();
  expect(screen.getByRole("image", { name: "Logo du club" })).toBeOnTheScreen();

  // When the same original URI returns, its previous error belongs to an unmounted attempt.
  await view.rerender(<ImageField images={[logo]} onSelect={onSelect} />);

  // Then
  expect(screen.queryByText(TECHNICAL_ERROR_TITLE)).not.toBeOnTheScreen();
  expect(screen.getByRole("image", { name: "Logo du club" })).toBeOnTheScreen();

  // When the current attempt fails and the user closes and reopens it.
  await fireEvent(
    screen.getByRole("image", { name: "Logo du club" }),
    "error",
    { nativeEvent: { error: "Native decoding failed" } },
  );
  await user.press(screen.getByRole("button", { name: "Fermer" }));
  await user.press(
    screen.getByRole("button", { name: "Aperçu : Logo du club" }),
  );

  // Then
  expect(screen.queryByText(TECHNICAL_ERROR_TITLE)).not.toBeOnTheScreen();
});

it("retains the caller's image choice after an empty-field validation error", async () => {
  // Given
  launch.mockResolvedValue({ canceled: false, assets: [photo] });
  const user = userEvent.setup();
  const onSelect = jest.fn();
  await renderField({
    onSelect,
    error: "Cette capture ne peut pas être utilisée.",
    chooseLabel: "Choisir une autre capture",
  });

  // When
  await user.press(
    screen.getByRole("button", { name: "Choisir une autre capture" }),
  );

  // Then
  expect(onSelect).toHaveBeenCalledWith([photo], undefined);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "Cette capture ne peut pas être utilisée.",
  );
});

it.each([
  "content://media/external/images/37",
  "ph://original-library-asset",
  "file:///library/original.jpg",
  "file:///cache-neighbor/original.jpg",
  "file:///cache/../library/original.jpg",
  "file:///cache/%2e%2e/library/original.jpg",
  "file:///cache/nested%2f..%2f../library/original.jpg",
  "file://another-host/cache/original.jpg",
  "file:///cache",
  "not a local URI",
])("preserves a borrowed or non-cache picker source: %s", async (uri) => {
  // Given
  const borrowed = { ...photo, uri };
  launch.mockResolvedValue({ canceled: false, assets: [borrowed] });
  const user = userEvent.setup();
  const onSelect = jest.fn();
  await renderField({ onSelect });

  // When
  await user.press(screen.getByRole("button", { name: "Choisir une image" }));

  // Then
  expect(onSelect).toHaveBeenCalledWith([borrowed], undefined);
  expect(mockDeleteFile).not.toHaveBeenCalled();
});

it("releases every delivered cache copy after preparation settles even if the field unmounted", async () => {
  // Given
  const second = {
    ...photo,
    uri: "file:///cache/ImagePicker/second.jpg",
    assetId: "file:///library/original.jpg",
  };
  launch.mockResolvedValue({ canceled: false, assets: [photo, second] });
  const preparation = Promise.withResolvers<void>();
  const onSelect = jest.fn(() => preparation.promise);
  const user = userEvent.setup();
  await renderField({
    onSelect,
    multiple: true,
    selectionLimit: 2,
  });
  await user.press(screen.getByRole("button", { name: "Choisir une image" }));
  expect(onSelect).toHaveBeenCalledWith([photo, second], undefined);

  // When
  await screen.unmount();

  // Then
  expect(mockDeleteFile).not.toHaveBeenCalled();

  // When
  await act(async () => preparation.resolve());

  // Then
  expect(mockDeleteFile.mock.calls).toEqual([[photo.uri], [second.uri]]);
});

/** Matches the application's theme and transient feedback owners for native selection scenarios. */
function MediaProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <ActionFeedbackProvider scopeKey="image-selection-test">
        {children}
      </ActionFeedbackProvider>
    </ThemeProvider>
  );
}
