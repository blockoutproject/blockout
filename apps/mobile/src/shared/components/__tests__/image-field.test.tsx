import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ThemeProvider } from "../../theme/theme-provider";
import { ImageField, type ImageFieldProps } from "../image-field";

jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));
const launch = jest.mocked(ImagePicker.launchImageLibraryAsync);
const logo = {
  id: "club-logo",
  uri: "file:///logo.png",
  label: "Logo du club",
};
const photo: ImagePicker.ImagePickerAsset = {
  uri: "file:///selection.jpg",
  width: 1200,
  height: 800,
  mimeType: "image/jpeg",
  fileSize: 2048,
};

/** Renders the real control and appearance provider; only the native picker is doubled. */
async function renderField(props: Partial<ImageFieldProps> = {}) {
  const onSelect = jest.fn();
  const onRemove = jest.fn();
  await render(
    <ThemeProvider>
      <ImageField
        label="Logo"
        images={[]}
        onSelect={onSelect}
        onRemove={onRemove}
        {...props}
      />
    </ThemeProvider>,
  );
  return { onSelect, onRemove, user: userEvent.setup() };
}

beforeEach(() => {
  launch.mockReset();
});

it("selects original native images without imposing cropping or persistence", async () => {
  // Given
  launch.mockResolvedValue({ canceled: false, assets: [photo] });
  const { user, onSelect } = await renderField();

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
    const { user, onSelect } = await renderField({
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

it("preserves the existing image when native selection is cancelled", async () => {
  // Given
  launch.mockResolvedValue({ canceled: true, assets: null });
  const { user, onSelect, onRemove } = await renderField({
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
    const { user, onSelect } = await renderField({ images: [logo] });

    // When
    await user.press(
      screen.getByRole("button", { name: "Changer l’image : Logo du club" }),
    );

    // Then
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Impossible de sélectionner l’image. Réessayez.",
    );
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
  const { user, onSelect, onRemove } = await renderField({ images: [logo] });

  // When
  await user.press(
    screen.getByRole("button", { name: "Aperçu : Logo du club" }),
  );
  expect(screen.getByRole("image", { name: "Logo du club" })).toBeOnTheScreen();
  await user.press(screen.getByRole("button", { name: "Fermer l’aperçu" }));

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
  const { user, onSelect, onRemove } = await renderField({
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
  launch.mockResolvedValue({ canceled: false, assets: [photo] });
  const { user } = await renderField({
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

it("retains the old image and caller validation error when preparation rejects unsupported or oversized bytes", async () => {
  // Given
  const oversized = {
    ...photo,
    fileSize: 5 * 1024 * 1024 + 1,
    mimeType: "image/heic",
  };
  launch.mockResolvedValue({ canceled: false, assets: [oversized] });
  const validate = jest
    .fn()
    .mockRejectedValue(new Error("private preparation details"));
  /** This owner fixture enforces its upload rules; the control never uploads or assumes MIME proves content. */
  function Owner() {
    const [error, setError] = useState<string>();
    return (
      <ThemeProvider>
        <ImageField
          label="Pièces jointes"
          images={[logo]}
          error={error}
          onRemove={jest.fn()}
          onSelect={async (assets) => {
            try {
              await validate(assets);
            } catch {
              setError("PNG/JPEG, 5 Mio maximum après préparation.");
            }
          }}
        />
      </ThemeProvider>
    );
  }
  const user = userEvent.setup();
  await render(<Owner />);

  // When
  await user.press(
    screen.getByRole("button", { name: "Changer l’image : Logo du club" }),
  );

  // Then
  expect(validate).toHaveBeenCalledWith([oversized]);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "PNG/JPEG, 5 Mio maximum après préparation.",
  );
  expect(
    screen.getByRole("button", { name: "Aperçu : Logo du club" }),
  ).toBeOnTheScreen();
});

it("exposes busy state during owner preparation and recovers safely from rejection", async () => {
  // Given
  launch.mockResolvedValue({ canceled: false, assets: [photo] });
  let rejectPreparation: (error: Error) => void = () => {};
  const onSelect = jest.fn(
    () =>
      new Promise<void>((_, reject) => {
        rejectPreparation = reject;
      }),
  );
  const { user } = await renderField({ images: [logo], onSelect });

  // When
  await user.press(
    screen.getByRole("button", { name: "Changer l’image : Logo du club" }),
  );

  // Then
  expect(
    screen.getByRole("button", {
      name: "Chargement…",
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
  await act(async () => {
    rejectPreparation(new Error("private URI"));
  });

  // Then
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Impossible de sélectionner l’image. Réessayez.",
  );
  expect(
    screen.getByRole("button", {
      name: "Changer l’image : Logo du club",
      disabled: false,
    }),
  ).toBeOnTheScreen();
});

it("prevents all image actions when the caller disables the field", async () => {
  // Given
  const { user, onRemove } = await renderField({
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
  let resolvePicker: (value: ImagePicker.ImagePickerResult) => void = () => {};
  launch.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolvePicker = resolve;
      }),
  );
  const { user, onSelect } = await renderField();

  // When
  await user.press(screen.getByRole("button", { name: "Choisir une image" }));
  await screen.unmount();
  await act(async () => {
    resolvePicker({ canceled: false, assets: [photo] });
  });

  // Then
  expect(onSelect).not.toHaveBeenCalled();
});

it("shows accepted caller values and removes them only when the owner updates", async () => {
  // Given
  launch.mockResolvedValue({ canceled: false, assets: [photo] });
  /** Local controlled fixture, without upload or business persistence. */
  function Owner() {
    const [images, setImages] = useState([logo]);
    return (
      <ThemeProvider>
        <ImageField
          label="Logo"
          images={images}
          onSelect={(assets) =>
            setImages(
              assets.map((asset) => ({
                id: "replacement",
                uri: asset.uri,
                label: "Nouveau logo",
              })),
            )
          }
          onRemove={(id) =>
            setImages((current) => current.filter((image) => image.id !== id))
          }
        />
      </ThemeProvider>
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
  const { user } = await renderField({ images: [logo] });
  await user.press(
    screen.getByRole("button", { name: "Aperçu : Logo du club" }),
  );

  // When
  fireEvent(screen.getByRole("image", { name: "Logo du club" }), "error", {
    nativeEvent: { error: "private file path" },
  });

  // Then
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Impossible d’afficher l’image.",
  );
  expect(
    screen.getByRole("button", { name: "Fermer l’aperçu" }),
  ).toBeOnTheScreen();
  expect(screen.queryByText(/private file path/)).not.toBeOnTheScreen();
});

it("offers the caller's retry meaning after an empty-field validation error", async () => {
  // Given
  launch.mockResolvedValue({ canceled: false, assets: [photo] });
  const { user, onSelect } = await renderField({
    error: "Cette capture ne peut pas être utilisée.",
    retryLabel: "Choisir une autre capture",
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
