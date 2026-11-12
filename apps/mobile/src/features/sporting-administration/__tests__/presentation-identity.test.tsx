import { fireEvent, render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { PresentationIdentity } from "../components/presentation-identity";

it.each([false, true])(
  "keeps the editor context's nominal logo after native decode failure (division: %s)",
  async (isDivision) => {
    // Given: only the native decoder is controlled; the actual context keeps its name and metadata.
    const props = {
      uri: "file:///prepared.png",
      loading: false,
      isDivision,
      name: "Division démo",
      title: "Équipe démo",
      seasonLabel: "2026/2027",
      color: "#184F3A",
      gradient: [],
    };
    const name = isDivision ? props.name : props.title;
    const view = await render(<PresentationIdentity {...props} />, {
      wrapper: ThemeProvider,
    });

    // When: the native context bitmap fails independently of the form's image field.
    await fireEvent(
      screen.getByRole("image", { name: `Logo : ${name}` }),
      "error",
      {
        nativeEvent: { error: "Controlled native decode failure" },
      },
    );

    // Then
    expect(
      screen.getByRole("image", { name: `Logo indisponible : ${name}` }),
    ).toBeOnTheScreen();
    expect(screen.getByText(name)).toBeOnTheScreen();
    expect(
      screen.getByText(isDivision ? "Aperçu" : props.seasonLabel),
    ).toBeOnTheScreen();
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Réessayer" })).toBeNull();

    // When: the owner supplies a replacement source without replacing the context.
    await view.rerender(
      <PresentationIdentity {...props} uri="file:///replacement.png" />,
    );
    await fireEvent(
      screen.getByRole("image", { name: `Logo : ${name}` }),
      "display",
    );

    // Then: the new image replaces only its predecessor's local failure.
    expect(
      screen.queryByRole("image", { name: `Logo indisponible : ${name}` }),
    ).not.toBeOnTheScreen();
    expect(screen.getByText(name)).toBeOnTheScreen();
  },
);
