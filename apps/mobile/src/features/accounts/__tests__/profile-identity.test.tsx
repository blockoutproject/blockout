import { fireEvent, render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import {
  ProfileIdentity,
  type ProfileIdentityProps,
} from "../components/profile-identity";
import { accountResponse } from "../test-support/account-response";

/** Uses the real theme and identity composition while native image events remain the controlled I/O boundary. */
function Identity(props: ProfileIdentityProps) {
  return (
    <ThemeProvider>
      <ProfileIdentity {...props} />
    </ThemeProvider>
  );
}

it("keeps known profile information while its optional foreground loads and fails", async () => {
  // Given
  const account = accountResponse({ hasPhoto: true });
  const membershipStatus = <Text>Compte Pro</Text>;

  // When
  const view = await render(
    <Identity
      account={account}
      photo={{ data: undefined, isFetching: true }}
      membershipStatus={membershipStatus}
    />,
  );

  // Then
  expect(screen.getByText(account.username)).toBeOnTheScreen();
  expect(screen.getByText(account.email)).toBeOnTheScreen();
  expect(screen.getByText("Compte Pro")).toBeOnTheScreen();
  expect(
    screen.getByRole("image", { name: "Photo de profil", busy: true }),
  ).toBeOnTheScreen();

  // When
  await view.rerender(
    <Identity
      account={account}
      photo={{ data: "data:image/png;base64,cGhvdG8=", isFetching: false }}
      membershipStatus={membershipStatus}
    />,
  );
  const foreground = screen.getByRole("image", {
    name: "Photo de profil",
    busy: true,
  });
  await fireEvent(foreground, "display");

  // Then
  expect(
    screen.getByRole("image", { name: "Photo de profil", busy: false }),
  ).toBeOnTheScreen();

  // When
  await fireEvent(foreground, "error", {
    nativeEvent: { error: "Native decode failed" },
  });

  // Then
  expect(
    screen.getByRole("image", { name: "Photo de profil indisponible" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("image", { name: "Photo de profil" }),
  ).not.toBeOnTheScreen();
  expect(screen.getByTestId("profile-photo-atmosphere")).toBeOnTheScreen();
  expect(screen.getByText(account.username)).toBeOnTheScreen();
  expect(screen.getByText(account.email)).toBeOnTheScreen();
  expect(screen.getByText("Compte Pro")).toBeOnTheScreen();
});

it("keeps the displayed photo when only its decorative background fails", async () => {
  // Given
  const account = accountResponse({ hasPhoto: true });
  await render(
    <Identity
      account={account}
      photo={{ data: "data:image/png;base64,cGhvdG8=", isFetching: false }}
    />,
  );
  await fireEvent(
    screen.getByRole("image", { name: "Photo de profil" }),
    "display",
  );

  // When
  await fireEvent(screen.getByTestId("profile-photo-atmosphere"), "error", {
    nativeEvent: { error: "Decorative decode failed" },
  });

  // Then
  expect(
    screen.queryByTestId("profile-photo-atmosphere"),
  ).not.toBeOnTheScreen();
  expect(
    screen.getByRole("image", { name: "Photo de profil", busy: false }),
  ).toBeOnTheScreen();
  expect(screen.getByText(account.username)).toBeOnTheScreen();
  expect(screen.getByText(account.email)).toBeOnTheScreen();
});

it("withdraws both photo layers after removal even while old bytes remain available", async () => {
  // Given
  const account = accountResponse({ hasPhoto: true });
  const photo = { data: "data:image/png;base64,cGhvdG8=", isFetching: false };
  const view = await render(<Identity account={account} photo={photo} />);
  await fireEvent(
    screen.getByRole("image", { name: "Photo de profil" }),
    "display",
  );

  // When
  await view.rerender(
    <Identity account={{ ...account, hasPhoto: false }} photo={photo} />,
  );

  // Then
  expect(
    screen.getByRole("image", { name: "Photo de profil absente" }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("image", { name: "Photo de profil" }),
  ).not.toBeOnTheScreen();
  expect(
    screen.queryByTestId("profile-photo-atmosphere"),
  ).not.toBeOnTheScreen();
  expect(screen.getByText(account.username)).toBeOnTheScreen();
});

it("retains a displayed photo through an ordinary reread of the same source", async () => {
  // Given
  const account = accountResponse({ hasPhoto: true });
  const photo = { data: "data:image/png;base64,cGhvdG8=", isFetching: false };
  const view = await render(<Identity account={account} photo={photo} />);
  await fireEvent(
    screen.getByRole("image", { name: "Photo de profil" }),
    "display",
  );

  // When
  await view.rerender(
    <Identity account={account} photo={{ ...photo, isFetching: true }} />,
  );

  // Then
  expect(
    screen.getByRole("image", { name: "Photo de profil", busy: false }),
  ).toBeOnTheScreen();
  expect(screen.getByText(account.username)).toBeOnTheScreen();
});

it("displays a replacement source after the previous photo failed", async () => {
  // Given
  const account = accountResponse({ hasPhoto: true });
  const view = await render(
    <Identity
      account={account}
      photo={{ data: "data:image/png;base64,Zmlyc3Q=", isFetching: false }}
    />,
  );
  await fireEvent(
    screen.getByRole("image", { name: "Photo de profil" }),
    "error",
    { nativeEvent: { error: "Native decode failed" } },
  );
  expect(
    screen.getByRole("image", { name: "Photo de profil indisponible" }),
  ).toBeOnTheScreen();

  // When
  await view.rerender(
    <Identity
      account={account}
      photo={{ data: "data:image/png;base64,c2Vjb25k", isFetching: false }}
    />,
  );
  await fireEvent(
    screen.getByRole("image", { name: "Photo de profil", busy: true }),
    "display",
  );

  // Then
  expect(
    screen.getByRole("image", { name: "Photo de profil", busy: false }),
  ).toBeOnTheScreen();
  expect(
    screen.queryByRole("image", { name: "Photo de profil indisponible" }),
  ).not.toBeOnTheScreen();
  expect(screen.getByText(account.username)).toBeOnTheScreen();
});
