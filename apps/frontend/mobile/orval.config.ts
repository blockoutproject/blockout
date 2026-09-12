import { defineConfig } from "orval";

const mobileGatewaySpec =
  "../../../libs/shared/contracts/generated/specs/mobile-gateway.json";

export default defineConfig({
  core: {
    input: "../../../libs/shared/contracts/generated/specs/core.json",
    output: {
      target: "./src/shared/generated/core/endpoints",
      schemas: "./src/shared/generated/core/models",
      client: "fetch",
      mode: "tags",
      clean: true,
    },
  },
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
