import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import {
  ProfileIdentity,
  type ProfileIdentityProps,
} from "../components/profile-identity";
import { accountResponse } from "../test-support/account-response";

/** Supplies the actual theme while exercising the identity's public photo/read inputs and native image events. */
function Identity(props: ProfileIdentityProps) {
  return (
    <ThemeProvider>
      <ProfileIdentity {...props} />
    </ThemeProvider>
  );
}

it("waits for native photo display and retains it across identical-byte reads", async () => {
  // Given
  const account = accountResponse({ hasPhoto: true });
  const photo = {
    data: "data:image/png;base64,cGhvdG8=",
    dataUpdatedAt: 1,
    isFetching: false,
  };
  const view = await render(<Identity account={account} photo={photo} />);
  const foreground = screen.getByRole("image", {
    name: "Photo de profil",
    busy: true,
  });
  const pendingDisplay = foreground.props.onDisplay;

  // When
  await fireEvent(foreground, "load");
  await fireEvent(screen.getByTestId("profile-photo-atmosphere"), "load");
  await view.rerender(
    <Identity account={account} photo={{ ...photo, dataUpdatedAt: 2 }} />,
  );

  // Then
  expect(
    screen.getByRole("image", { name: "Photo de profil", busy: true }),
  ).toBeOnTheScreen();
  expect(screen.getByText(account.username)).toBeOnTheScreen();

  // When
  await act(() => pendingDisplay());

  // Then
  expect(
    screen.getByRole("image", { name: "Photo de profil", busy: false }),
  ).toBeOnTheScreen();

  // When
  await view.rerender(
    <Identity account={account} photo={{ ...photo, dataUpdatedAt: 3 }} />,
  );

  // Then
  expect(
    screen.getByRole("image", { name: "Photo de profil", busy: false }),
  ).toBeOnTheScreen();
});

it("keeps a failed replacement withdrawn after former photo callbacks and permits a new accepted read", async () => {
  // Given
  const account = accountResponse({ hasPhoto: true });
  const firstPhoto = {
    data: "data:image/png;base64,Zmlyc3Q=",
    dataUpdatedAt: 1,
    isFetching: false,
  };
  const replacementPhoto = {
    data: "data:image/png;base64,c2Vjb25k",
    dataUpdatedAt: 2,
    isFetching: false,
  };
  const view = await render(<Identity account={account} photo={firstPhoto} />);
  // Native callbacks can already be queued when a former image is detached.
  const formerError = screen.getByRole("image", { name: "Photo de profil" })
    .props.onError;
  const formerAtmosphereError = screen.getByTestId("profile-photo-atmosphere")
    .props.onError;
  await view.rerender(<Identity account={account} photo={replacementPhoto} />);
  const replacement = screen.getByRole("image", { name: "Photo de profil" });
  const replacementError = replacement.props.onError;
  const replacementDisplay = replacement.props.onDisplay;
  await fireEvent(replacement, "error", {
    nativeEvent: { error: "Replacement decode failed" },
  });

  // When
  await act(() => {
    formerError({ nativeEvent: { error: "Detached photo failed" } });
    formerAtmosphereError({
      nativeEvent: { error: "Detached artwork failed" },
    });
    replacementDisplay();
  });

  // Then
  expect(
    screen.getByRole("image", { name: "Photo de profil indisponible" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByTestId("profile-photo-atmosphere"),
  ).not.toBeOnTheScreen();

  // When
  // Accepted read revisions are compared by equality, without assuming a monotonic clock.
  await view.rerender(
    <Identity
      account={account}
      photo={{ ...replacementPhoto, dataUpdatedAt: 1 }}
    />,
  );
  await act(() => {
    replacementError({ nativeEvent: { error: "Former attempt failed" } });
    replacementDisplay();
  });

  // Then
  const retried = screen.getByRole("image", {
    name: "Photo de profil",
    busy: true,
  });

  // When
  await fireEvent(retried, "display");

  // Then
  expect(
    screen.getByRole("image", { name: "Photo de profil", busy: false }),
  ).toBeOnTheScreen();
});

it("invalidates former callbacks when the admitted photo is withdrawn despite retained bytes", async () => {
  // Given
  const account = accountResponse({ hasPhoto: true });
  const photo = {
    data: "data:image/png;base64,cGhvdG8=",
    dataUpdatedAt: 1,
    isFetching: false,
  };
  const view = await render(<Identity account={account} photo={photo} />);
  const formerError = screen.getByRole("image", { name: "Photo de profil" })
    .props.onError;

  // When
  await view.rerender(
    <Identity account={{ ...account, hasPhoto: false }} photo={photo} />,
  );

  // Then
  expect(
    screen.getByRole("image", { name: "Photo de profil absente" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByTestId("profile-photo-atmosphere"),
  ).not.toBeOnTheScreen();

  // When
  await view.rerender(<Identity account={account} photo={photo} />);
  await act(() =>
    formerError({ nativeEvent: { error: "Withdrawn photo failed" } }),
  );

  // Then
  expect(
    screen.getByRole("image", { name: "Photo de profil", busy: true }),
  ).toBeOnTheScreen();
});

it("replaces the failed native host when an accepted reread is batched with its error", async () => {
  // Given
  const account = accountResponse({ hasPhoto: true });
  const photo = {
    data: "data:image/png;base64,cGhvdG8=",
    dataUpdatedAt: 1,
    isFetching: false,
  };
  const view = await render(<Identity account={account} photo={photo} />);
  const formerImage = screen.getByRole("image", { name: "Photo de profil" });

  // When
  // The old host may never commit its withdrawn state before the parent admits the new read.
  await act(async () => {
    formerImage.props.onError({
      nativeEvent: { error: "Native decode failed" },
    });
    await view.rerender(
      <Identity account={account} photo={{ ...photo, dataUpdatedAt: 2 }} />,
    );
  });

  // Then
  expect(formerImage).not.toBeOnTheScreen();
  expect(
    screen.getByRole("image", { name: "Photo de profil", busy: true }),
  ).toBeOnTheScreen();
});
