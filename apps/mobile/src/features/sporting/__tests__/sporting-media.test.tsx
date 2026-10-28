import { fireEvent, render, screen } from "@testing-library/react-native";
import { View } from "react-native";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { SportingCover, SportingMedia } from "../components/sporting-media";

it("uses only the supplied monogram and never derives initials from a full name", async () => {
  // Given
  const identity = {
    name: "Association Sportive du Littoral",
    shortName: "ASL",
  };
  const view = await render(
    <ThemeProvider>
      <SportingMedia identity={identity} kind="team" />
    </ThemeProvider>,
  );
  expect(screen.getByText("ASL")).toBeOnTheScreen();

  // When
  await view.rerender(
    <ThemeProvider>
      <SportingMedia identity={{ name: identity.name }} kind="team" />
    </ThemeProvider>,
  );

  // Then
  expect(
    screen.getByRole("image", { name: `Logo absent : ${identity.name}` }),
  ).toBeOnTheScreen();
  expect(screen.queryByText("ASL")).not.toBeOnTheScreen();
  expect(screen.queryByText("AS")).not.toBeOnTheScreen();
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
    expect(foreground).toHaveProp("source", expect.arrayContaining([{ uri }]));
    expect(atmosphere).toHaveProp("source", expect.arrayContaining([{ uri }]));

    // When
    await fireEvent(
      failedLayer === "foreground" ? foreground : atmosphere,
      "error",
      { nativeEvent: { error: "Native decoder rejected the image" } },
    );

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
