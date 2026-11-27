import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
  within,
} from "@testing-library/react-native";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { SportingCover, SportingMedia } from "../components/sporting-media";

it("uses the neutral missing-image fallback even when a short name is available", async () => {
  // Given
  const identity = {
    name: "Association Sportive du Littoral",
    shortName: "ASL",
  };

  // When
  await render(
    <ThemeProvider>
      <SportingMedia identity={identity} kind="team" />
    </ThemeProvider>,
  );

  // Then
  expect(
    screen.getByRole("image", { name: `Logo absent : ${identity.name}` }),
  ).toBeOnTheScreen();
  expect(screen.getByTestId("sporting-logo-fallback")).toBeVisible();
  expect(screen.queryByText("ASL")).not.toBeOnTheScreen();
});

it.each([
  { loading: true, error: false, label: "Chargement du logo", busy: true },
  { loading: false, error: true, label: "Logo indisponible", busy: false },
])(
  "announces $label without substituting the monogram",
  async ({ loading, error, label, busy }) => {
    // Given
    const identity = { name: "Volley des Rives", shortName: "VR" };

    // When
    await render(
      <ThemeProvider>
        <SportingMedia
          identity={identity}
          kind="team"
          loading={loading}
          error={error}
        />
      </ThemeProvider>,
    );

    // Then
    expect(
      screen.getByRole("image", { name: `${label} : ${identity.name}`, busy }),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("sporting-logo-fallback")).toBeVisible();
    expect(screen.queryByText("VR")).not.toBeOnTheScreen();
    if (error) {
      expect(screen.queryByText("Logo indisponible")).not.toBeOnTheScreen();
    }
  },
);

it("shows the ordinary fallback and hides an already loaded halo until the logo is displayed", async () => {
  // Given
  const identity = { name: "Volley des Rives" };
  await render(
    <ThemeProvider>
      <SportingMedia
        identity={identity}
        kind="team"
        uri="https://api.example.invalid/logos/team.png"
        renderWithAtmosphere={(logo, atmosphere) => (
          <View>
            {atmosphere}
            {logo}
          </View>
        )}
      />
    </ThemeProvider>,
  );
  const slot = screen.getByRole("image", {
    name: `Logo : ${identity.name}`,
    busy: true,
  });
  const foreground = within(slot).getByTestId("sporting-logo-image");
  const halo = screen.getByTestId("sporting-logo-atmosphere");

  // When
  await fireEvent(foreground, "load", {
    nativeEvent: {
      source: { url: "https://api.example.invalid/logos/team.png" },
    },
  });
  await fireEvent(halo, "load");

  // Then
  expect(
    screen.getByRole("image", { name: `Logo : ${identity.name}`, busy: true }),
  ).toBeOnTheScreen();
  expect(within(slot).getByTestId("sporting-logo-fallback")).toBeVisible();
  expect(halo).not.toBeVisible();

  // When
  await fireEvent(foreground, "display");

  // Then
  expect(
    screen.getByRole("image", { name: `Logo : ${identity.name}`, busy: false }),
  ).toBeOnTheScreen();
  expect(screen.queryByTestId("sporting-logo-fallback")).not.toBeOnTheScreen();
  expect(halo).toBeVisible();
});

it("retains a non-card media skeleton until a pending logo fails", async () => {
  // Given
  await render(
    <ThemeProvider>
      <SportingMedia
        identity={{ name: "Volley des Rives" }}
        kind="team"
        uri="https://api.example.invalid/logos/team.png"
        pendingPlaceholder="skeleton"
      />
    </ThemeProvider>,
  );
  const slot = screen.getByRole("image", {
    name: "Logo : Volley des Rives",
    busy: true,
  });
  expect(
    within(slot).queryByTestId("sporting-logo-fallback"),
  ).not.toBeOnTheScreen();

  // When
  await fireEvent(within(slot).getByTestId("sporting-logo-image"), "error", {
    nativeEvent: { error: "Native decoder rejected the image" },
  });

  // Then
  const unavailable = screen.getByRole("image", {
    name: "Logo indisponible : Volley des Rives",
    busy: false,
  });
  expect(
    within(unavailable).getByTestId("sporting-logo-fallback"),
  ).toBeVisible();
});

it("retains caller content and ignores former events when an image source returns", async () => {
  // Given
  const identity = { name: "Volley des Rives" };
  const firstUri = "data:image/png;base64,Zmlyc3Q=";
  const replacementUri = "data:image/png;base64,c2Vjb25k";
  const user = userEvent.setup();

  /** Represents caller-owned input beside the media; replacing an image must not remount that content. */
  function CardDraft() {
    const [value, setValue] = useState("");
    return (
      <TextInput
        accessibilityLabel="Brouillon de la carte"
        value={value}
        onChangeText={setValue}
      />
    );
  }

  /** Keeps the real composition stable while only its native media source changes. */
  function Card({ uri }: Readonly<{ uri: string }>) {
    return (
      <ThemeProvider>
        <SportingMedia
          identity={identity}
          kind="team"
          uri={uri}
          atmosphere={{ withdrawLogoOnError: true }}
          renderWithAtmosphere={(logo, atmosphere) => (
            <View>
              {atmosphere}
              {logo}
              <CardDraft />
            </View>
          )}
        />
      </ThemeProvider>
    );
  }

  const view = await render(<Card uri={firstUri} />);
  const firstSlot = screen.getByRole("image", {
    name: `Logo : ${identity.name}`,
  });
  const firstImage = within(firstSlot).getByTestId("sporting-logo-image");
  // Native callbacks may already be queued when a former image view is detached.
  const staleDisplay = firstImage.props.onDisplay;
  const staleError = firstImage.props.onError;
  const staleAtmosphereError = screen.getByTestId("sporting-logo-atmosphere")
    .props.onError;
  await user.type(
    screen.getByLabelText("Brouillon de la carte"),
    "Texte conservé",
  );

  // When
  await view.rerender(<Card uri={replacementUri} />);
  const replacementSlot = screen.getByRole("image", {
    name: `Logo : ${identity.name}`,
  });
  await fireEvent(
    within(replacementSlot).getByTestId("sporting-logo-image"),
    "display",
  );
  await view.rerender(<Card uri={firstUri} />);
  await act(() => {
    staleDisplay();
    staleError({ nativeEvent: { error: "Detached image failure" } });
    staleAtmosphereError({
      nativeEvent: { error: "Detached artwork failure" },
    });
  });

  // Then
  const currentSlot = screen.getByRole("image", {
    name: `Logo : ${identity.name}`,
    busy: true,
  });
  expect(screen.queryByText("Logo indisponible")).not.toBeOnTheScreen();
  expect(screen.getByTestId("sporting-logo-atmosphere")).toHaveProp("source", {
    uri: firstUri,
    cache: "reload",
  });
  expect(screen.getByDisplayValue("Texte conservé")).toBeOnTheScreen();

  // When
  await fireEvent(
    within(currentSlot).getByTestId("sporting-logo-image"),
    "display",
  );

  // Then
  expect(
    screen.getByRole("image", { name: `Logo : ${identity.name}`, busy: false }),
  ).toBeOnTheScreen();
});

it("removes decorative artwork after a native decoding error event", async () => {
  // Given
  await render(
    <SportingCover
      uri="data:image/png;base64,bm90LWFuLWltYWdl"
      primary="#F4C66A"
    />,
  );
  const cover = screen.getByTestId("sporting-decorative-cover");
  expect(cover).toHaveProp("source", {
    uri: "data:image/png;base64,bm90LWFuLWltYWdl",
    cache: "reload",
  });
  expect(cover).not.toBeVisible();
  await fireEvent(cover, "load");
  expect(cover).toBeVisible();

  // When
  await fireEvent(cover, "error", {
    nativeEvent: { error: "Native decoder rejected the image" },
  });

  // Then
  expect(
    screen.queryByTestId("sporting-decorative-cover"),
  ).not.toBeOnTheScreen();
});

it("retains the logo when its optional atmosphere fails to decode", async () => {
  // Given
  const uri = "https://api.example.invalid/logos/team.png";
  const identity = { name: "Volley des Rives" };
  await render(
    <ThemeProvider>
      <SportingMedia
        identity={identity}
        kind="team"
        uri={uri}
        renderWithAtmosphere={(logo, halo) => (
          <View>
            {halo}
            {logo}
          </View>
        )}
      />
    </ThemeProvider>,
  );
  const slot = screen.getByRole("image", { name: `Logo : ${identity.name}` });
  await fireEvent(within(slot).getByTestId("sporting-logo-image"), "display");
  const halo = screen.getByTestId("sporting-logo-atmosphere");
  expect(halo).not.toBeVisible();

  // When
  await fireEvent(halo, "load");
  expect(halo).toBeVisible();
  await fireEvent(halo, "error", {
    nativeEvent: { error: "Atmosphere decoding failed" },
  });

  // Then
  expect(
    screen.queryByTestId("sporting-logo-atmosphere"),
  ).not.toBeOnTheScreen();
  expect(
    screen.getByRole("image", { name: `Logo : ${identity.name}`, busy: false }),
  ).toBeOnTheScreen();
});

it.each(["foreground", "atmosphere"] as const)(
  "keeps the paired standings fallback after a native %s decoding failure",
  async (failedLayer) => {
    // Given
    const uri = "data:image/png;base64,c3ludGhldGljLWxvZ28=";
    const identity = { name: "Volley des Rives" };
    await render(
      <ThemeProvider>
        <SportingMedia
          identity={identity}
          kind="team"
          uri={uri}
          atmosphere={{ withdrawLogoOnError: true }}
          renderWithAtmosphere={(logo, atmosphere) => (
            <View>
              {atmosphere}
              {logo}
            </View>
          )}
        />
        <SportingMedia
          identity={{ name: "Autre équipe" }}
          kind="team"
          uri={uri}
        />
      </ThemeProvider>,
    );
    const slot = screen.getByRole("image", {
      name: `Logo : ${identity.name}`,
    });
    const foreground = within(slot).getByTestId("sporting-logo-image");
    const atmosphere = screen.getByTestId("sporting-logo-atmosphere");
    const lateDisplay = foreground.props.onDisplay;
    expect(foreground).toHaveProp("source", expect.arrayContaining([{ uri }]));
    expect(atmosphere).toHaveProp("source", { uri, cache: "reload" });

    // When
    await fireEvent(
      failedLayer === "foreground" ? foreground : atmosphere,
      "error",
      { nativeEvent: { error: "Native decoder rejected the image" } },
    );
    await act(() => lateDisplay());

    // Then
    expect(
      screen.queryByRole("image", { name: `Logo : ${identity.name}` }),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId("sporting-logo-atmosphere"),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByRole("image", {
        name: `Logo indisponible : ${identity.name}`,
      }),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Logo indisponible")).not.toBeOnTheScreen();
    expect(
      screen.getByRole("image", { name: "Logo : Autre équipe" }),
    ).toBeOnTheScreen();
  },
);
