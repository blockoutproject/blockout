import { act, render, screen, userEvent } from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import type { PropsWithChildren } from "react";
import { ThemeProvider } from "../../theme/theme-provider";
import { useImageSelection } from "../../images/use-image-selection";
import { ActionFeedbackProvider } from "../action-feedback";
import { ImageChoicesProvider, ImageChoicesSheet } from "../image-choices";
import {
  SingleImageField,
  type SingleImageFieldProps,
} from "../single-image-field";

jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  useRouter: () => mockRouter,
  usePathname: () => "/profile/edit",
}));
jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock("expo-file-system", () => ({
  File: jest.fn((uri: string) => ({ uri, exists: true, delete: jest.fn() })),
  Paths: {
    cache: { uri: "file:///cache/" },
    normalize: jest.requireActual("expo-file-system").Paths.normalize,
  },
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  canGoBack: () => true,
  replace: jest.fn(),
};
const launch = jest.mocked(ImagePicker.launchImageLibraryAsync);
const photo: ImagePicker.ImagePickerAsset = {
  uri: "file:///cache/ImagePicker/selection.jpg",
  width: 1200,
  height: 800,
  mimeType: "image/jpeg",
  fileSize: 2048,
};

/** The field and native selection owner are real; navigation and the system picker are external I/O. */
function EditableImage({
  onSelect,
  ...props
}: Omit<SingleImageFieldProps, "selection"> & {
  onSelect: (assets: ImagePicker.ImagePickerAsset[]) => void | Promise<void>;
}) {
  const selection = useImageSelection({
    canSelect: () => !props.disabled,
    onSelect,
  });
  return <SingleImageField {...props} selection={selection} />;
}

/** Keeps the actual native-sheet content beside its caller when only navigation is controlled. */
function MediaProviders({ children }: PropsWithChildren) {
  return (
    <ThemeProvider>
      <ActionFeedbackProvider scopeKey="single-image-test">
        <ImageChoicesProvider>
          {children}
          <ImageChoicesSheet />
        </ImageChoicesProvider>
      </ActionFeedbackProvider>
    </ThemeProvider>
  );
}

beforeEach(() => {
  launch.mockReset();
  jest.clearAllMocks();
});

it.each([
  { appearance: "photo" as const, label: "Photo de profil", loading: true },
  { appearance: "logo" as const, label: "Logo", loading: false },
])(
  "keeps authorized $appearance choices and local removal usable without a decoded preview",
  async ({ appearance, label, loading }) => {
    // Given
    const user = userEvent.setup();
    const remove = jest.fn();
    const select = jest.fn();
    await render(
      <EditableImage
        label={label}
        appearance={appearance}
        hasImage
        loading={loading}
        onSelect={select}
        onRemove={remove}
        removeLabel="Rétablir l’image automatique"
      />,
      { wrapper: MediaProviders },
    );

    // When
    await user.press(screen.getByRole("button", { name: "Modifier l’image" }));

    // Then
    expect(mockRouter.push).toHaveBeenCalledWith("/image-choices");
    expect(
      screen.getByRole("button", { name: "Choisir une image" }),
    ).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: /Aperçu/ }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByRole("button", { name: "Réessayer" }),
    ).not.toBeOnTheScreen();
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();

    // When
    await user.press(
      screen.getByRole("button", { name: "Rétablir l’image automatique" }),
    );

    // Then
    expect(remove).toHaveBeenCalledTimes(1);
    expect(select).not.toHaveBeenCalled();
    expect(launch).not.toHaveBeenCalled();
    expect(screen.queryByRole("header", { name: label })).not.toBeOnTheScreen();
  },
);

it("offers choosing without granting removal for an inherited image", async () => {
  // Given
  const user = userEvent.setup();
  await render(<EditableImage label="Logo" hasImage onSelect={jest.fn()} />, {
    wrapper: MediaProviders,
  });

  // When
  await user.press(screen.getByRole("button", { name: "Modifier l’image" }));

  // Then
  expect(
    screen.getByRole("button", { name: "Choisir une image" }),
  ).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: "Supprimer l’image" }),
  ).not.toBeOnTheScreen();
});

it("withdraws both open-sheet actions when the owner loses authorization", async () => {
  // Given
  const user = userEvent.setup();
  const remove = jest.fn();
  const select = jest.fn();
  const view = await render(
    <EditableImage label="Logo" hasImage onSelect={select} onRemove={remove} />,
    { wrapper: MediaProviders },
  );
  await user.press(screen.getByRole("button", { name: "Modifier l’image" }));

  // When
  await view.rerender(
    <EditableImage
      label="Logo"
      hasImage
      disabled
      onSelect={select}
      onRemove={remove}
    />,
  );
  await user.press(screen.getByRole("button", { name: "Choisir une image" }));
  await user.press(screen.getByRole("button", { name: "Supprimer l’image" }));

  // Then
  expect(
    screen.getByRole("button", { name: "Choisir une image" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: "Supprimer l’image" }),
  ).toBeDisabled();
  expect(screen.getByRole("button", { name: "Fermer" })).toBeEnabled();
  expect(launch).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
  expect(select).not.toHaveBeenCalled();
});

it("rejects a native selection completed after the same owner's authorization was withdrawn", async () => {
  // Given
  const native = Promise.withResolvers<ImagePicker.ImagePickerResult>();
  launch.mockReturnValue(native.promise);
  const select = jest.fn();
  const user = userEvent.setup();
  const view = await render(
    <EditableImage
      label="Photo de profil"
      hasImage={false}
      onSelect={select}
    />,
    { wrapper: MediaProviders },
  );
  await user.press(screen.getByRole("button", { name: "Ajouter une image" }));
  await user.press(screen.getByRole("button", { name: "Choisir une image" }));
  await view.rerender(
    <EditableImage
      label="Photo de profil"
      hasImage={false}
      disabled
      onSelect={select}
    />,
  );

  // When
  await act(async () => native.resolve({ canceled: false, assets: [photo] }));

  // Then
  expect(select).not.toHaveBeenCalled();
});

it("keeps the native sheet's choice pending through preparation without duplicating selection", async () => {
  // Given
  const preparation = Promise.withResolvers<void>();
  launch.mockResolvedValue({ canceled: false, assets: [photo] });
  const select = jest.fn(() => preparation.promise);
  const user = userEvent.setup();
  await render(
    <EditableImage label="Logo" hasImage={false} onSelect={select} />,
    {
      wrapper: MediaProviders,
    },
  );
  await user.press(screen.getByRole("button", { name: "Ajouter une image" }));

  // When
  await user.press(screen.getByRole("button", { name: "Choisir une image" }));
  await user.press(screen.getByRole("button", { name: "Choisir une image" }));

  // Then
  expect(launch).toHaveBeenCalledTimes(1);
  expect(select).toHaveBeenCalledWith([photo], undefined);
  expect(screen.getByRole("button", { name: "Fermer" })).toBeDisabled();

  // When
  await act(async () => preparation.resolve());

  // Then
  expect(screen.queryByRole("header", { name: "Logo" })).not.toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Ajouter une image" }),
  ).toBeEnabled();
});

it("opens a direct preview and withdraws it with its source", async () => {
  // Given
  const user = userEvent.setup();
  const select = jest.fn();
  const view = await render(
    <EditableImage
      label="Logo"
      hasImage
      image={{
        id: "club-logo",
        uri: "file:///club.png",
        label: "Logo du club",
      }}
      onSelect={select}
    />,
    { wrapper: MediaProviders },
  );

  // When
  await user.press(
    screen.getByRole("button", { name: "Aperçu : Logo du club" }),
  );

  // Then
  expect(screen.getByRole("image", { name: "Logo du club" })).toBeOnTheScreen();
  expect(screen.queryByRole("header", { name: "Logo" })).not.toBeOnTheScreen();

  // When
  await view.rerender(
    <EditableImage label="Logo" hasImage onSelect={select} />,
  );

  // Then
  expect(
    screen.queryByRole("button", { name: "Fermer" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Modifier l’image" }),
  ).toBeEnabled();
  expect(select).not.toHaveBeenCalled();

  // When the same accepted source becomes readable again, reading does not reopen a dismissed viewer.
  await view.rerender(
    <EditableImage
      label="Logo"
      hasImage
      image={{
        id: "club-logo",
        uri: "file:///club.png",
        label: "Logo du club",
      }}
      onSelect={select}
    />,
  );

  // Then
  expect(
    screen.queryByRole("button", { name: "Fermer" }),
  ).not.toBeOnTheScreen();
});

it("retires an unmounted field's open choices before another field can use them", async () => {
  // Given
  const user = userEvent.setup();
  const remove = jest.fn();
  const select = jest.fn();
  const view = await render(
    <EditableImage
      key="old"
      label="Logo"
      hasImage
      onSelect={select}
      onRemove={remove}
    />,
    { wrapper: MediaProviders },
  );
  await user.press(screen.getByRole("button", { name: "Modifier l’image" }));

  // When
  await view.rerender(
    <EditableImage
      key="new"
      label="Photo"
      hasImage={false}
      onSelect={select}
    />,
  );
  await user.press(screen.getByRole("button", { name: "Ajouter une image" }));

  // Then
  expect(screen.getByRole("header", { name: "Photo" })).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: "Supprimer l’image" }),
  ).not.toBeOnTheScreen();
  expect(remove).not.toHaveBeenCalled();
});
