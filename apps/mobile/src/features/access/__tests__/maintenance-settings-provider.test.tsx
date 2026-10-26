import { ActionFeedbackProvider } from "../../../shared/components/action-feedback";
import {
  ApplicationAccessProvider,
  useApplicationAccess,
} from "../queries/use-application-access";
import { Alert, Text, type AlertButton } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  render,
  screen,
  userEvent,
  waitFor,
} from "@testing-library/react-native";
import { createQueryClient } from "../../../shared/query/query-client";
import { ThemeProvider } from "../../../shared/theme/theme-provider";
import { AccountSessionProvider } from "../../accounts/session/account-session-provider";
import { initializeV2Installation } from "../../onboarding/initialize-v2-installation";
import {
  credentialsFor,
  mockAuth0,
} from "../../accounts/test-support/native-auth0";
import {
  getMaintenanceSettings,
  changeMaintenanceSettings,
  setMaintenanceActivation,
  getApplicationVersionSettings,
  changeApplicationVersionSettings,
  getApplicationAccess,
  getGetApplicationAccessQueryKey,
} from "../../../../.generated/mobile";
import { ApiError } from "../../../shared/api/api-fetch";
import { MaintenanceSettingsScreen } from "../screens/maintenance-settings-screen";

jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);
jest.mock("../../onboarding/initialize-v2-installation", () => ({
  initializeV2Installation: jest.fn(),
}));
jest.mock("react-native-auth0", () => {
  jest.requireActual("react-native").NativeModules.A0Auth0 = jest.requireActual(
    "../../accounts/test-support/native-auth0",
  ).mockAuth0;
  return jest.requireActual("react-native-auth0");
});

jest.mock("expo-router", () => ({
  ...jest.requireActual("expo-router"),
  usePreventRemove: jest.fn(),
  useRouter: () => ({ back: jest.fn() }),
}));
// Node Fetch replaces native networking only. Every request reaches the actual Spring provider.
jest.mock("expo/fetch", () => ({
  fetch: async (url: RequestInfo | URL, options?: RequestInit) => {
    if (String(url).endsWith("/application-access")) mockPublicReads++;
    const response = await jest.requireActual("node-fetch")(url, options);
    if (options?.method === "PATCH") {
      mockPatchCount++;
      if (mockLoseNextResponse) {
        mockLoseNextResponse = false;
        throw new TypeError("Response lost after server commit");
      }
    }
    return response;
  },
}));
let mockLoseNextResponse = false;
let mockPatchCount = 0;
let mockPublicReads = 0;
let client = createQueryClient();
const environment = { ...process.env };
const provider = process.env.BLOCKOUT_ACCESS_PROVIDER_URL;
const one = {
  headers: {
    Authorization: `Bearer ${process.env.BLOCKOUT_ACCESS_EDITOR_ONE ?? ""}`,
  },
};
const two = {
  headers: {
    Authorization: `Bearer ${process.env.BLOCKOUT_ACCESS_EDITOR_TWO ?? ""}`,
  },
};
const suite = provider ? describe : describe.skip;

suite("real PostgreSQL/provider/generated consumer integration", () => {
  beforeEach(async () => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    Object.assign(process.env, {
      EXPO_PUBLIC_API_URL: provider,
      EXPO_PUBLIC_AUTH0_DOMAIN: "identity.example.invalid",
      EXPO_PUBLIC_AUTH0_CLIENT_ID: "mobile-test",
    });
    client = createQueryClient();
    mockLoseNextResponse = false;
    mockPatchCount = 0;
    mockPublicReads = 0;
    jest.mocked(initializeV2Installation).mockResolvedValue();
    mockAuth0.hasValidCredentials.mockReset().mockResolvedValue(true);
    mockAuth0.getCredentials.mockReset().mockResolvedValue({
      ...credentialsFor("auth0|first"),
      accessToken: process.env.BLOCKOUT_ACCESS_EDITOR_ONE ?? "",
    });
    mockAuth0.clearCredentials.mockReset().mockResolvedValue();
    const maintenance = await getMaintenanceSettings(one);
    const inactive = await setMaintenanceActivation(
      { revision: maintenance.revision, active: false },
      one,
    );
    await changeMaintenanceSettings(
      { revision: inactive.revision, message: "Prepared", imageUrl: null },
      one,
    );
    const versions = await getApplicationVersionSettings(one);
    await changeApplicationVersionSettings(
      {
        revision: versions.revision,
        ios: { minimumVersion: null, storeUrl: null },
        android: { minimumVersion: null, storeUrl: null },
        message: null,
      },
      one,
    );
    mockPatchCount = 0;
  });
  afterEach(() => {
    jest.restoreAllMocks();
    client.clear();
    process.env = { ...environment };
  });

  it("returns complete public state and publishes content only after explicit activation", async () => {
    // Given
    const current = await getMaintenanceSettings(one);

    // When
    const saved = await changeMaintenanceSettings(
      { revision: current.revision, message: "Published later" },
      one,
    );
    const inactive = await getApplicationAccess();
    await setMaintenanceActivation(
      { revision: saved.revision, active: true },
      two,
    );
    const active = await getApplicationAccess();

    // Then
    expect(inactive.maintenance).toMatchObject({
      active: false,
      message: null,
      imageUrl: null,
    });
    expect(active.maintenance).toMatchObject({
      active: true,
      message: "Published later",
    });
    const corrected = await changeMaintenanceSettings(
      {
        revision: active.maintenance.revision,
        message: "Corrected while active",
      },
      one,
    );
    expect(corrected.active).toBe(true);
    expect((await getApplicationAccess()).maintenance.message).toBe(
      "Corrected while active",
    );
  });
  it("allows independent groups while excluding simultaneous same-group edits", async () => {
    // Given
    const maintenance = await getMaintenanceSettings(one);
    const versions = await getApplicationVersionSettings(two);

    // When
    const independent = await Promise.all([
      changeMaintenanceSettings(
        { revision: maintenance.revision, message: "Independent" },
        one,
      ),
      changeApplicationVersionSettings(
        { revision: versions.revision, message: "Update" },
        two,
      ),
    ]);
    const competing = await Promise.allSettled([
      changeMaintenanceSettings(
        { revision: independent[0].revision, message: "First" },
        one,
      ),
      changeMaintenanceSettings(
        { revision: independent[0].revision, message: "Second" },
        two,
      ),
    ]);

    // Then
    expect(independent[1].revision).toBe(versions.revision + 1);
    expect(
      competing.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const failure = competing.find((result) => result.status === "rejected");
    expect(failure?.status === "rejected" && failure.reason).toMatchObject({
      status: 409,
      problem: { type: "urn:blockout:problem:stale-revision" },
    });
  });
  it("shares one platform revision and refuses invalid complete results atomically", async () => {
    // Given
    const current = await getApplicationVersionSettings(one);
    const ios = await changeApplicationVersionSettings(
      {
        revision: current.revision,
        ios: {
          minimumVersion: "2.10.0",
          storeUrl: "https://apps.apple.com/fr/app/blockout/id123",
        },
      },
      one,
    );

    // When / Then
    await expect(
      changeApplicationVersionSettings(
        {
          revision: current.revision,
          android: {
            minimumVersion: "2.0.0",
            storeUrl:
              "https://play.google.com/store/apps/details?id=com.blockoutproject.blockout",
          },
        },
        two,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      changeApplicationVersionSettings(
        {
          revision: ios.revision,
          ios: { storeUrl: null },
          message: "Rejected atomically",
        },
        two,
      ),
    ).rejects.toMatchObject({ status: 422 });
    await expect(
      changeApplicationVersionSettings(
        {
          revision: ios.revision,
          android: {
            minimumVersion: "9007199254740992.0.0",
            storeUrl:
              "https://play.google.com/store/apps/details?id=com.blockoutproject.blockout",
          },
        },
        two,
      ),
    ).rejects.toMatchObject({ status: 422 });
    expect(await getApplicationVersionSettings(one)).toEqual(ios);
    const maintenance = await getMaintenanceSettings(one);
    await expect(
      changeMaintenanceSettings(
        {
          revision: maintenance.revision,
          imageUrl: "http://assets.example.invalid/a.png",
        },
        one,
      ),
    ).rejects.toBeInstanceOf(ApiError);
    expect(await getMaintenanceSettings(one)).toEqual(maintenance);
  });
  it("preserves a real conflicting draft through reread and explicit resubmission", async () => {
    // Given
    await renderEditor();
    const user = await draft("First editor draft");
    const current = await getMaintenanceSettings(two);
    await changeMaintenanceSettings(
      { revision: current.revision, message: "Other editor" },
      two,
    );

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await act(async () => nativeAction("Enregistrer").onPress?.());

    // Then
    await screen.findByRole("button", { name: "Relire les réglages" });
    expect(screen.getByDisplayValue("First editor draft")).toBeOnTheScreen();
    expect((await getMaintenanceSettings(two)).message).toBe("Other editor");
    const writes = mockPatchCount;

    // When
    await user.press(
      screen.getByRole("button", { name: "Relire les réglages" }),
    );

    // Then
    await screen.findByText(
      "Réglages relus. Vérifiez votre brouillon avant de le soumettre à nouveau.",
    );
    expect(mockPatchCount).toBe(writes);
    expect(screen.getByDisplayValue("First editor draft")).toBeOnTheScreen();

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await act(async () => nativeAction("Enregistrer").onPress?.());

    // Then
    await waitFor(() =>
      expect(
        screen.queryByText("Modifications non enregistrées"),
      ).not.toBeOnTheScreen(),
    );
    expect((await getMaintenanceSettings(two)).message).toBe(
      "First editor draft",
    );
  });
  it("retains a committed lost-response draft and closes admission without a public refetch", async () => {
    // Given
    const publicKey = getGetApplicationAccessQueryKey();
    await renderEditor();
    await screen.findByText("Admission verified");
    const full = client.getQueryData(publicKey);
    const publicReads = mockPublicReads;
    const user = await draft("Committed despite lost response");
    mockLoseNextResponse = true;

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await act(async () => nativeAction("Enregistrer").onPress?.());

    // Then
    await screen.findByRole("button", { name: "Relire les réglages" });
    expect((await getMaintenanceSettings(two)).message).toBe(
      "Committed despite lost response",
    );
    expect(
      screen.getByDisplayValue("Committed despite lost response"),
    ).toBeOnTheScreen();
    const writes = mockPatchCount;

    // When
    await user.press(
      screen.getByRole("button", { name: "Relire les réglages" }),
    );

    // Then
    await screen.findByText(
      "Réglages relus. Vérifiez votre brouillon avant de le soumettre à nouveau.",
    );
    expect(mockPatchCount).toBe(writes);

    // When
    await user.press(screen.getByRole("button", { name: "Enregistrer" }));
    await act(async () => nativeAction("Enregistrer").onPress?.());

    // Then
    await waitFor(() =>
      expect(
        screen.queryByText("Modifications non enregistrées"),
      ).not.toBeOnTheScreen(),
    );
    expect(
      await screen.findByText("Admission requires retry"),
    ).toBeOnTheScreen();
    expect(client.getQueryData(publicKey)).toEqual(full);
    expect(mockPublicReads).toBe(publicReads);
  });
});
/** Finds a named choice in the displayed native alert without accepting it during setup. */
function nativeAction(label: string): AlertButton {
  const button = jest
    .mocked(Alert.alert)
    .mock.lastCall?.[2]?.find((choice) => choice.text === label);
  if (!button) throw new Error(`The native action ${label} is missing`);
  return button;
}
/** Mounts the actual form component with its real F05/Query owners, outside production route admission. */
async function renderEditor() {
  await render(
    <>
      <MaintenanceSettingsScreen />
      <AccessObservation />
    </>,
    {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>
          <ThemeProvider>
            <ActionFeedbackProvider scopeKey="test">
              <ApplicationAccessProvider>
                <AccountSessionProvider>{children}</AccountSessionProvider>
              </ApplicationAccessProvider>
            </ActionFeedbackProvider>
          </ThemeProvider>
        </QueryClientProvider>
      ),
    },
  );
  await screen.findByLabelText("Message de maintenance");
}
/** Edits the real RHF-controlled native input; the server receives only the generated mutation. */
async function draft(message: string) {
  const user = userEvent.setup();
  await user.clear(screen.getByLabelText("Message de maintenance"));
  await user.type(screen.getByLabelText("Message de maintenance"), message);
  return user;
}

/** Renders actual process admission evidence independently of the retained public query cache. */
function AccessObservation() {
  const { snapshot } = useApplicationAccess();
  return (
    <Text>
      {snapshot.complete ? "Admission verified" : "Admission requires retry"}
    </Text>
  );
}
