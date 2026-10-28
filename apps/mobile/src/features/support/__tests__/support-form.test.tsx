import {
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { TECHNICAL_ERROR } from "../../../shared/components/error-copy";
import { SupportVisitProvider } from "../forms/support-visit";
import { SupportForm } from "../forms/support-form";
import { SupportChoice } from "../components/support-choice";

// Only native navigation is replaced; both real route consumers use the same RHF control.
jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  usePreventRemove: jest.fn(),
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

/** Keeps controlled submission I/O visible while mounting actual theme, feedback and form owners. */
function form(
  onSubmit: (request: unknown) => Promise<void>,
  replyEmail = "",
  field?: "kind" | "subject",
) {
  return (
    <ThemeProvider>
      <ActionFeedbackProvider scopeKey="support-test">
        <SupportVisitProvider
          context={{ screen: "Profil" }}
          replyEmail={replyEmail}
        >
          <SupportForm onSubmit={onSubmit} />
          {field && <SupportChoice field={field} />}
        </SupportVisitProvider>
      </ActionFeedbackProvider>
    </ThemeProvider>
  );
}

it("explains missing fields in French and preserves the explanation", async () => {
  // Given
  const onSubmit = jest.fn();
  await render(form(onSubmit));
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText("Description"),
    "Le bouton ne répond pas.",
  );

  // When
  await user.press(screen.getByRole("button", { name: "Envoyer la demande" }));

  // Then
  expect(await screen.findByText("Indiquez un titre.")).toBeOnTheScreen();
  expect(
    screen.getByDisplayValue("Le bouton ne répond pas."),
  ).toBeOnTheScreen();
  expect(
    screen.getByText("Indiquez une adresse e-mail de réponse."),
  ).toBeOnTheScreen();
  expect(onSubmit).not.toHaveBeenCalled();
});

it("retains editable title, description and corrected contact after refusal", async () => {
  // Given
  const onSubmit = jest.fn().mockRejectedValue(new Error("Unavailable"));
  await render(form(onSubmit, "known@example.invalid"));
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Titre"), "Titre conservé");
  await user.type(
    screen.getByLabelText("Description"),
    "Description conservée",
  );
  await user.clear(screen.getByLabelText("E-mail de réponse"));
  await user.type(
    screen.getByLabelText("E-mail de réponse"),
    "contact@example.invalid",
  );

  // When
  await user.press(screen.getByRole("button", { name: "Envoyer la demande" }));

  // Then
  expect(await screen.findByText(TECHNICAL_ERROR)).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Titre conservé")).toBeOnTheScreen();
  expect(screen.getByDisplayValue("Description conservée")).toBeOnTheScreen();
  expect(screen.getByDisplayValue("contact@example.invalid")).toBeOnTheScreen();
  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({
      replyEmail: "contact@example.invalid",
      context: { screen: "Profil" },
    }),
  );
});

it("changes to suggestion and adapts guidance through the shared choice form", async () => {
  // Given
  await render(form(jest.fn(), "", "kind"));
  const user = userEvent.setup();

  // When
  await user.press(
    screen.getByRole("radio", { name: "Suggérer une amélioration" }),
  );

  // Then
  expect(
    screen.getByRole("button", { name: "Nature de la demande" }),
  ).toHaveAccessibilityValue({ text: "Suggérer une amélioration" });
  expect(
    screen.getByText("Décrivez votre besoin et l’amélioration souhaitée."),
  ).toBeOnTheScreen();
});

it("can remove a context-based subject without adding a required classification", async () => {
  // Given
  await render(form(jest.fn(), "", "subject"));
  const user = userEvent.setup();

  // When
  await user.press(screen.getByRole("radio", { name: "Sans sujet" }));

  // Then
  expect(
    screen.getByRole("button", { name: "Sujet (facultatif)" }),
  ).toHaveAccessibilityValue({ text: "Sans sujet" });
});

it("prefills a contact arriving later only while untouched", async () => {
  // Given
  const onSubmit = jest.fn();
  const view = await render(form(onSubmit));

  // When
  await view.rerender(form(onSubmit, "late@example.invalid"));

  // Then
  expect(
    await screen.findByDisplayValue("late@example.invalid"),
  ).toBeOnTheScreen();
});

it("respects an intentionally emptied contact when the known address arrives later", async () => {
  // Given
  const onSubmit = jest.fn();
  const view = await render(form(onSubmit));
  const user = userEvent.setup();
  await user.type(
    screen.getByLabelText("E-mail de réponse"),
    "edit@example.invalid",
  );
  await user.clear(screen.getByLabelText("E-mail de réponse"));

  // When
  await view.rerender(form(onSubmit, "late@example.invalid"));

  // Then
  await waitFor(() =>
    expect(screen.getByLabelText("E-mail de réponse")).toHaveDisplayValue(""),
  );
});
