import {
  act,
  cleanup,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import * as ImagePicker from "expo-image-picker";
import type { PropsWithChildren } from "react";
import { ActionSheetIOS, Alert, Platform } from "react-native";
import {
  nativeImageChoiceAction,
  nativeImageChoiceLabels,
} from "../../native/test-support/native-image-choices";
import { ThemeProvider } from "../../theme/theme-provider";
import { useImageSelection } from "../../images/use-image-selection";
import { ActionFeedbackProvider } from "../action-feedback";
import {
  SingleImageField,
  type SingleImageFieldProps,
} from "../single-image-field";

jest.mock("expo-image-picker", () => ({ launchImageLibraryAsync: jest.fn() }));
jest.mock("expo-file-system", () => ({
  File: jest.fn((uri: string) => ({ uri, exists: true, delete: jest.fn() })),
  Paths: {
    cache: { uri: "file:///cache/" },
    normalize: jest.requireActual("expo-file-system").Paths.normalize,
  },
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

const launch = jest.mocked(ImagePicker.launchImageLibraryAsync);
const photo: ImagePicker.ImagePickerAsset = {
  uri: "file:///cache/ImagePicker/selection.jpg",
  width: 1200,
  height: 800,
  mimeType: "image/jpeg",
  fileSize: 2048,
};

/** The field and selection/preparation owner are real; only system menu, file and picker I/O are controlled. */
function EditableImage({
  onSelect,
  ...props
}: Readonly<
  Omit<SingleImageFieldProps, "selection"> & {
    onSelect: (assets: ImagePicker.ImagePickerAsset[]) => void | Promise<void>;
  }
>) {
  const selection = useImageSelection({
    canSelect: () => !props.disabled,
    onSelect,
  });
  return <SingleImageField {...props} selection={selection} />;
}

/** Supplies the actual theme and ordinary feedback without an application menu or navigation double. */
function MediaProviders({ children }: Readonly<PropsWithChildren>) {
  return (
    <ThemeProvider>
      <ActionFeedbackProvider scopeKey="single-image-test">
        {children}
      </ActionFeedbackProvider>
    </ThemeProvider>
  );
}

beforeEach(() => {
  launch.mockReset();
  jest
    .spyOn(ActionSheetIOS, "showActionSheetWithOptions")
    .mockImplementation(() => {});
  jest.spyOn(ActionSheetIOS, "dismissActionSheet").mockImplementation(() => {});
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

describe.each(["ios", "android"] as const)(
  "%s system image actions",
  (platform) => {
    beforeEach(() => {
      jest.replaceProperty(Platform, "OS", platform);
    });

    it.each([
      { appearance: "photo" as const, label: "Photo de profil", loading: true },
      { appearance: "logo" as const, label: "Logo", loading: false },
    ])(
      "keeps authorized $appearance choice and local reset available without a displayed image",
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
            helper="PNG/JPEG · 5 Mio maximum"
            onSelect={select}
            onRemove={remove}
            removeLabel="Rétablir l’image automatique"
          />,
          { wrapper: MediaProviders },
        );

        // When
        await user.press(
          screen.getByRole("button", { name: "Modifier l’image" }),
        );

        // Then
        expect([...nativeImageChoiceLabels()].sort()).toEqual(
          [
            "Choisir une image",
            "Rétablir l’image automatique",
            "Annuler",
          ].sort(),
        );
        expect(
          screen.queryByRole("button", { name: /Aperçu/ }),
        ).not.toBeOnTheScreen();
        expect(
          screen.queryByRole("button", { name: "Réessayer" }),
        ).not.toBeOnTheScreen();
        expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
        if (platform === "ios") {
          expect(
            ActionSheetIOS.showActionSheetWithOptions,
          ).toHaveBeenCalledWith(
            {
              title: label,
              options: [
                "Choisir une image",
                "Rétablir l’image automatique",
                "Annuler",
              ],
              cancelButtonIndex: 2,
              destructiveButtonIndex: 1,
            },
            expect.any(Function),
          );
          expect(Alert.alert).not.toHaveBeenCalled();
        } else {
          expect(jest.mocked(Alert.alert).mock.lastCall?.[1]).toBeUndefined();
          expect(
            ActionSheetIOS.showActionSheetWithOptions,
          ).not.toHaveBeenCalled();
        }

        // When
        await act(() =>
          nativeImageChoiceAction("Rétablir l’image automatique")(),
        );

        // Then
        expect(remove).toHaveBeenCalledTimes(1);
        expect(select).not.toHaveBeenCalled();
        expect(launch).not.toHaveBeenCalled();
      },
    );

    it("offers only choosing and cancellation when the owner supplies no removal", async () => {
      // Given
      const user = userEvent.setup();
      await render(
        <EditableImage label="Logo" hasImage onSelect={jest.fn()} />,
        {
          wrapper: MediaProviders,
        },
      );

      // When
      await user.press(
        screen.getByRole("button", { name: "Modifier l’image" }),
      );

      // Then
      expect([...nativeImageChoiceLabels()].sort()).toEqual([
        "Annuler",
        "Choisir une image",
      ]);
    });

    it("cancels without work and prevents a duplicate or old callback from consuming a later menu", async () => {
      // Given
      const user = userEvent.setup();
      const remove = jest.fn();
      const select = jest.fn();
      await render(
        <EditableImage
          label="Logo"
          hasImage
          onSelect={select}
          onRemove={remove}
        />,
        { wrapper: MediaProviders },
      );
      await user.press(
        screen.getByRole("button", { name: "Modifier l’image" }),
      );
      const cancel = nativeImageChoiceAction("Annuler");

      // When
      await user.press(
        screen.getByRole("button", { name: "Modifier l’image" }),
      );
      await act(() => cancel());
      await user.press(
        screen.getByRole("button", { name: "Modifier l’image" }),
      );
      const currentRemove = nativeImageChoiceAction("Supprimer l’image");
      await act(() => cancel());
      await user.press(
        screen.getByRole("button", { name: "Modifier l’image" }),
      );

      // Then
      expect(
        platform === "ios"
          ? ActionSheetIOS.showActionSheetWithOptions
          : Alert.alert,
      ).toHaveBeenCalledTimes(2);
      expect(remove).not.toHaveBeenCalled();
      expect(select).not.toHaveBeenCalled();
      expect(launch).not.toHaveBeenCalled();

      // When
      await act(() => currentRemove());
      await act(() => currentRemove());

      // Then
      expect(remove).toHaveBeenCalledTimes(1);
    });

    it("retires both retained native actions when account authority is withdrawn", async () => {
      // Given
      const user = userEvent.setup();
      const remove = jest.fn();
      const select = jest.fn();
      const view = await render(
        <EditableImage
          label="Logo"
          hasImage
          onSelect={select}
          onRemove={remove}
        />,
        { wrapper: MediaProviders },
      );
      await user.press(
        screen.getByRole("button", { name: "Modifier l’image" }),
      );
      const choose = nativeImageChoiceAction("Choisir une image");
      const removePhoto = nativeImageChoiceAction("Supprimer l’image");

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
      await act(() => choose());
      await act(() => removePhoto());

      // Then
      expect(
        screen.getByRole("button", { name: "Modifier l’image" }),
      ).toBeDisabled();
      expect(launch).not.toHaveBeenCalled();
      expect(remove).not.toHaveBeenCalled();
      expect(select).not.toHaveBeenCalled();
      expect(ActionSheetIOS.dismissActionSheet).toHaveBeenCalledTimes(
        platform === "ios" ? 1 : 0,
      );
    });

    it("retires removal when that capability disappears and can reopen the remaining choices", async () => {
      // Given
      const user = userEvent.setup();
      const remove = jest.fn();
      const view = await render(
        <EditableImage
          label="Logo"
          hasImage
          onSelect={jest.fn()}
          onRemove={remove}
        />,
        { wrapper: MediaProviders },
      );
      await user.press(
        screen.getByRole("button", { name: "Modifier l’image" }),
      );
      const retained = nativeImageChoiceAction("Supprimer l’image");

      // When
      await view.rerender(
        <EditableImage label="Logo" hasImage onSelect={jest.fn()} />,
      );
      await user.press(
        screen.getByRole("button", { name: "Modifier l’image" }),
      );
      await act(() => retained());

      // Then
      expect([...nativeImageChoiceLabels()].sort()).toEqual([
        "Annuler",
        "Choisir une image",
      ]);
      expect(remove).not.toHaveBeenCalled();
      expect(ActionSheetIOS.dismissActionSheet).toHaveBeenCalledTimes(
        platform === "ios" ? 1 : 0,
      );
    });

    it("dispatches the current authorized callback when the same owner rerenders", async () => {
      // Given
      const user = userEvent.setup();
      const previous = jest.fn();
      const current = jest.fn();
      const view = await render(
        <EditableImage
          label="Logo"
          hasImage
          onSelect={jest.fn()}
          onRemove={previous}
        />,
        { wrapper: MediaProviders },
      );
      await user.press(
        screen.getByRole("button", { name: "Modifier l’image" }),
      );
      const retained = nativeImageChoiceAction("Supprimer l’image");

      // When
      await view.rerender(
        <EditableImage
          label="Logo"
          hasImage
          onSelect={jest.fn()}
          onRemove={current}
        />,
      );
      await act(() => retained());

      // Then
      expect(previous).not.toHaveBeenCalled();
      expect(current).toHaveBeenCalledTimes(1);
    });

    it("rejects callbacks from an unmounted field without dismissing a later field's menu", async () => {
      // Given
      const user = userEvent.setup();
      const remove = jest.fn();
      const view = await render(
        <EditableImage
          key="old"
          label="Logo"
          hasImage
          onSelect={jest.fn()}
          onRemove={remove}
        />,
        { wrapper: MediaProviders },
      );
      await user.press(
        screen.getByRole("button", { name: "Modifier l’image" }),
      );
      const oldRemove = nativeImageChoiceAction("Supprimer l’image");
      const oldChoose = nativeImageChoiceAction("Choisir une image");

      // When
      await view.rerender(
        <EditableImage
          key="new"
          label="Photo"
          hasImage={false}
          onSelect={jest.fn()}
        />,
      );
      await user.press(
        screen.getByRole("button", { name: "Ajouter une image" }),
      );
      await act(() => oldRemove());
      await act(() => oldChoose());

      // Then
      expect(remove).not.toHaveBeenCalled();
      expect(launch).not.toHaveBeenCalled();
      expect([...nativeImageChoiceLabels()].sort()).toEqual([
        "Annuler",
        "Choisir une image",
      ]);
      expect(ActionSheetIOS.dismissActionSheet).toHaveBeenCalledTimes(
        platform === "ios" ? 1 : 0,
      );
    });

    it("rejects native files completed after the same owner's authorization was withdrawn", async () => {
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
      await user.press(
        screen.getByRole("button", { name: "Ajouter une image" }),
      );
      await act(() => nativeImageChoiceAction("Choisir une image")());
      await view.rerender(
        <EditableImage
          label="Photo de profil"
          hasImage={false}
          disabled
          onSelect={select}
        />,
      );

      // When
      await act(async () =>
        native.resolve({ canceled: false, assets: [photo] }),
      );

      // Then
      expect(select).not.toHaveBeenCalled();
      expect(ActionSheetIOS.dismissActionSheet).not.toHaveBeenCalled();
    });

    it("hands off to one picker and keeps the field unavailable until preparation finishes", async () => {
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
      await user.press(
        screen.getByRole("button", { name: "Ajouter une image" }),
      );
      const choose = nativeImageChoiceAction("Choisir une image");

      // When
      await act(() => choose());
      await act(() => choose());
      await user.press(
        screen.getByRole("button", { name: "Ajouter une image" }),
      );

      // Then
      expect(launch).toHaveBeenCalledTimes(1);
      expect(select).toHaveBeenCalledWith([photo], undefined);
      expect(
        screen.getByRole("button", { name: "Ajouter une image" }),
      ).toBeDisabled();
      expect(ActionSheetIOS.dismissActionSheet).not.toHaveBeenCalled();
      expect(
        platform === "ios"
          ? ActionSheetIOS.showActionSheetWithOptions
          : Alert.alert,
      ).toHaveBeenCalledTimes(1);

      // When
      await act(async () => preparation.resolve());

      // Then
      expect(
        screen.getByRole("button", { name: "Ajouter une image" }),
      ).toBeEnabled();
    });
  },
);

it("treats Android Back or outside dismissal as cancellation and lets the field reopen its choices", async () => {
  // Given
  jest.replaceProperty(Platform, "OS", "android");
  const user = userEvent.setup();
  const remove = jest.fn();
  await render(
    <EditableImage
      label="Logo"
      hasImage
      onSelect={jest.fn()}
      onRemove={remove}
    />,
    { wrapper: MediaProviders },
  );
  await user.press(screen.getByRole("button", { name: "Modifier l’image" }));
  const dismissed = jest.mocked(Alert.alert).mock.lastCall?.[3]?.onDismiss;

  // When
  await act(() => dismissed?.());
  await user.press(screen.getByRole("button", { name: "Modifier l’image" }));

  // Then
  expect(Alert.alert).toHaveBeenCalledTimes(2);
  expect(remove).not.toHaveBeenCalled();
  expect(launch).not.toHaveBeenCalled();
});

it("keeps the displayed image passive and updates it with its source", async () => {
  // Given
  const user = userEvent.setup();
  const select = jest.fn();
  const image = {
    id: "club-logo",
    uri: "file:///club.png",
    label: "Logo du club",
  };
  const view = await render(
    <EditableImage label="Logo" hasImage image={image} onSelect={select} />,
    { wrapper: MediaProviders },
  );

  // When
  await user.press(
    screen.getByRole("image", { name: "Miniature : Logo du club" }),
  );

  // Then
  expect(
    screen.getByRole("image", { name: "Miniature : Logo du club" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("button", { name: /Aperçu|Fermer/ }),
  ).not.toBeOnTheScreen();
  expect(ActionSheetIOS.showActionSheetWithOptions).not.toHaveBeenCalled();
  expect(Alert.alert).not.toHaveBeenCalled();

  // When
  await view.rerender(
    <EditableImage label="Logo" hasImage onSelect={select} />,
  );

  // Then
  expect(
    screen.getByRole("image", { name: "Logo indisponible" }),
  ).toBeOnTheScreen();

  // When
  await view.rerender(
    <EditableImage label="Logo" hasImage image={image} onSelect={select} />,
  );

  // Then
  expect(
    screen.getByRole("image", { name: "Miniature : Logo du club" }),
  ).toBeOnTheScreen();
  expect(
    screen.getByRole("button", { name: "Modifier l’image" }),
  ).toBeEnabled();
  expect(select).not.toHaveBeenCalled();
});
