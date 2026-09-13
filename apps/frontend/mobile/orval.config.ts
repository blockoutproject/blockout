import { defineConfig } from "orval";

const mobileGatewaySpec =
  "../../../libs/shared/contracts/generated/specs/mobile-gateway.json";

export default defineConfig({
  mobileGateway: {
    input: mobileGatewaySpec,
    output: {
      target: "./src/shared/generated/endpoints",
      schemas: "./src/shared/generated/models",
      client: "fetch",
      mode: "tags",
      clean: true,
      override: {
        fetch: {
          includeHttpResponseReturnType: false,
        },
        mutator: {
          path: "./src/shared/api/orval-fetch.ts",
          name: "orvalFetch",
        },
      },
    },
  },
});
