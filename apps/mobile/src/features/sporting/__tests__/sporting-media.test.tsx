import {
  act,
  fireEvent,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { useState } from "react";
import { TextInput, View } from "react-native";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
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
    expect(screen.queryByText("VR")).not.toBeOnTheScreen();
    if (error) expect(screen.getByText("Logo indisponible")).toBeOnTheScreen();
  },
);

it("announces native logo loading until its foreground is displayed", async () => {
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
  const foreground = screen.getByRole("image", {
    name: `Logo : ${identity.name}`,
    busy: true,
  });

  // When
  await fireEvent(foreground, "load", {
    nativeEvent: {
      source: { url: "https://api.example.invalid/logos/team.png" },
    },
  });
  await fireEvent(screen.getByTestId("sporting-logo-atmosphere"), "display");

  // Then
  expect(
    screen.getByRole("image", { name: `Logo : ${identity.name}`, busy: true }),
  ).toBeOnTheScreen();

  // When
  await fireEvent(foreground, "display");

  // Then
  expect(
    screen.getByRole("image", { name: `Logo : ${identity.name}`, busy: false }),
  ).toBeOnTheScreen();
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
  function Card({ uri }: { uri: string }) {
    return (
      <ThemeProvider>
        <SportingMedia
          identity={identity}
          kind="team"
          uri={uri}
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
  const firstImage = screen.getByRole("image", {
    name: `Logo : ${identity.name}`,
  });
  // Native callbacks may already be queued when a former image view is detached.
  const staleDisplay = firstImage.props.onDisplay;
  const staleError = firstImage.props.onError;
  await user.type(
    screen.getByLabelText("Brouillon de la carte"),
    "Texte conservé",
  );

  // When
  await view.rerender(<Card uri={replacementUri} />);
  await fireEvent(
    screen.getByRole("image", { name: `Logo : ${identity.name}` }),
    "display",
  );
  await view.rerender(<Card uri={firstUri} />);
  await act(() => {
    staleDisplay();
    staleError({ nativeEvent: { error: "Detached image failure" } });
  });

  // Then
  const currentImage = screen.getByRole("image", {
    name: `Logo : ${identity.name}`,
    busy: true,
  });
  expect(screen.queryByText("Logo indisponible")).not.toBeOnTheScreen();
  expect(screen.getByDisplayValue("Texte conservé")).toBeOnTheScreen();

  // When
  await fireEvent(currentImage, "display");

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

  // When
  await fireEvent(cover, "error", {
    nativeEvent: { error: "Native decoder rejected the image" },
  });

  // Then
  expect(
    screen.queryByTestId("sporting-decorative-cover"),
  ).not.toBeOnTheScreen();
});

it.each(["foreground", "atmosphere"] as const)(
  "removes both same-logo card layers after a native %s decoding failure",
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
    const foreground = screen.getByRole("image", {
      name: `Logo : ${identity.name}`,
    });
    const atmosphere = screen.getByTestId("sporting-logo-atmosphere");
    const lateDisplay = foreground.props.onDisplay;
    expect(foreground).toHaveProp("source", expect.arrayContaining([{ uri }]));
    expect(atmosphere).toHaveProp("source", expect.arrayContaining([{ uri }]));

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
    expect(screen.getByText("Logo indisponible")).toBeOnTheScreen();
    expect(
      screen.getByRole("image", { name: "Logo : Autre équipe" }),
    ).toBeOnTheScreen();
  },
);
