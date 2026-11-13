import { redirectSystemPath } from "../../../app/+native-intent";

const entityId = "00000000-0000-4000-8000-000000000720";

it.each([
  {
    initial: true,
    path: `/clubs/${entityId}?name=Rives%20Est#teams`,
    detail: `/clubs/${entityId}?name=Rives%20Est#teams`,
  },
  {
    initial: false,
    path: `blockout-local://pools/${entityId}`,
    detail: `/pools/${entityId}`,
  },
  {
    initial: true,
    path: `blockout-local:///teams/${entityId}`,
    detail: `/teams/${entityId}`,
  },
  {
    initial: false,
    path: `https://blockout.example.invalid/matches/${entityId}?tab=links#contribution`,
    detail: `/matches/${entityId}?tab=links#contribution`,
  },
])(
  "qualifies the exact sporting destination from $path (initial: $initial)",
  ({ initial, path, detail }) => {
    // Given: the native entry supplies a URL or path, independently of the current tab.

    // When
    const destination = redirectSystemPath({ path, initial });

    // Then
    expect(destination).toBe(`/(ordinary)/(tabs)/(discovery)${detail}`);
  },
);

it.each([
  "/profile/edit",
  "/profile/erase",
  `blockout-local://matches/${entityId}/contribution`,
  `/matches/${entityId}/contributions`,
  `/matches/${entityId}/report-contribution`,
  "/search/filters",
  "/administration/maintenance",
  "com.blockout.local.auth0://identity.example.invalid/android/com.blockout.local/callback?code=synthetic",
  "https://[",
])("leaves the existing Router handling intact for %s", (path) => {
  // Given: this system entry is outside the four exact sporting-detail routes.

  // When
  const destination = redirectSystemPath({ path, initial: false });

  // Then
  expect(destination).toBe(path);
});
