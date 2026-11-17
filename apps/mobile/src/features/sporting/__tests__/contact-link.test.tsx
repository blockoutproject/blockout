import { ActionFeedbackProvider } from "@/shared/components/action-feedback";
import {
  cleanup,
  act,
  render,
  screen,
  userEvent,
} from "@testing-library/react-native";
import { Linking } from "react-native";
import { ThemeProvider } from "@/shared/theme/theme-provider";
import { ContactLink } from "../components/contact-link";

afterEach(async () => {
  await cleanup();
  jest.restoreAllMocks();
});

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
  expect(jest.mocked(Linking.openURL).mock.calls).toEqual([
    ["https://a.example.invalid"],
  ]);
  expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
});

it.each(["contact", "information"] as const)(
  "keeps the named %s action unavailable until native opening completes",
  async (presentation) => {
    // Given
    const opening = Promise.withResolvers<void>();
    const open = jest
      .spyOn(Linking, "openURL")
      .mockReturnValueOnce(opening.promise)
      .mockResolvedValue(undefined);
    const user = userEvent.setup();
    await render(
      <ContactLink
        label="Site"
        value="Club A"
        destination="https://a.example.invalid"
        presentation={presentation}
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

    // When
    await user.press(screen.getByRole("link", { name: "Site : Club A" }));
    await user.press(
      screen.getByRole("link", {
        name: "Site : Club A",
        disabled: true,
        busy: true,
      }),
    );

    // Then
    expect(open).toHaveBeenCalledTimes(1);
    await act(async () => opening.resolve());
    await user.press(
      screen.getByRole("link", {
        name: "Site : Club A",
        disabled: false,
        busy: false,
      }),
    );
    expect(open).toHaveBeenCalledTimes(2);
  },
);
