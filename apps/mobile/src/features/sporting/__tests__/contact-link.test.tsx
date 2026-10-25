import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import { act, render, screen, userEvent } from "@testing-library/react-native";
import { Linking } from "react-native";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { ContactLink } from "../components/contact-link";

afterEach(() => jest.restoreAllMocks());

it("does not carry a late opening failure across destination changes, including a return to the original link", async () => {
  // Given
  const opening = Promise.withResolvers<void>();
  jest.spyOn(Linking, "openURL").mockReturnValueOnce(opening.promise);
  const user = userEvent.setup();
  const view = await render(
    <ContactLink
      label="Site"
      value="Club A"
      destination="https://a.example.invalid"
    />,
    {
      wrapper: ({ children }) => (
        <ThemeProvider>
          <ActionFeedbackProvider scopeKey="test">
            {children}
          </ActionFeedbackProvider>
        </ThemeProvider>
      ),
    },
  );
  await user.press(screen.getByRole("link", { name: "Site : Club A" }));

  // When
  await view.rerender(
    <ContactLink
      label="Site"
      value="Club B"
      destination="https://b.example.invalid"
    />,
  );
  await act(async () => opening.reject(new Error("Native opening rejected")));
  await view.rerender(
    <ContactLink
      label="Site"
      value="Club A"
      destination="https://a.example.invalid"
    />,
  );

  // Then
  expect(screen.getByRole("link", { name: "Site : Club A" })).toBeOnTheScreen();
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
});
