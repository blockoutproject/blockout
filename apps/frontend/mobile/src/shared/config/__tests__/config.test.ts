import { validateRequiredConfig } from "@/src/shared/config/config";

const validConfig = {
  AUTH0_DOMAIN: "login.blockoutproject.com",
  AUTH0_CLIENT_ID: "native-client",
  AUTH0_WEB_CLIENT_ID: "web-client",
  AUTH0_AUDIENCE: "https://api.blockoutproject.com/",
  API_GATEWAY_BASE_URL: "http://localhost:8089/api/v1/mobile",
};

describe("required public configuration", () => {
  it("accepts the platform-specific Auth0 client", () => {
    expect(() => validateRequiredConfig(validConfig, "ios")).not.toThrow();
    expect(() => validateRequiredConfig(validConfig, "web")).not.toThrow();
  });

  it("reports every missing common value at startup", () => {
    expect(() =>
      validateRequiredConfig(
        {
          ...validConfig,
          AUTH0_DOMAIN: "",
          API_GATEWAY_BASE_URL: "  ",
        },
        "android",
      ),
    ).toThrow(
      "Missing required Expo public configuration: EXPO_PUBLIC_AUTH0_DOMAIN, EXPO_PUBLIC_API_GATEWAY_BASE_URL",
    );
  });

  it("does not fall back to the native Auth0 client on Web", () => {
    expect(() =>
      validateRequiredConfig(
        { ...validConfig, AUTH0_WEB_CLIENT_ID: "" },
        "web",
      ),
    ).toThrow("EXPO_PUBLIC_AUTH0_WEB_CLIENT_ID");
  });
});
