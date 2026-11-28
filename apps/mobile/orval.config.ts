import { defineConfig } from "orval";

/** Generates all active mobile consumers from the same bundled contract as the server. */
export default defineConfig({
  mobile: {
    input: "../../contracts/http/.generated/mobile.yaml",
    output: {
      target: ".generated/mobile.ts",
      client: "react-query",
      httpClient: "fetch",
      schemas: { path: ".generated/schemas", type: "zod", mode: "single" },
      clean: true,
      override: {
        operations: {
          setClubPresentation: {
            formData: {
              path: "src/shared/api/image-form-data.ts",
              name: "imageFormData",
            },
          },
          setTeamPresentation: {
            formData: {
              path: "src/shared/api/image-form-data.ts",
              name: "imageFormData",
            },
          },
          createDivision: {
            formData: {
              path: "src/shared/api/image-form-data.ts",
              name: "imageFormData",
            },
          },
          setDivisionPresentation: {
            formData: {
              path: "src/shared/api/image-form-data.ts",
              name: "imageFormData",
            },
          },
          changeAccountProfile: {
            formData: {
              path: "src/shared/api/image-form-data.ts",
              name: "imageFormData",
            },
          },
          createSupportRequest: {
            formData: {
              path: "src/features/support/api/support-form-data.ts",
              name: "supportFormData",
            },
          },
          getClubLogo: { requestOptions: { responseType: "blob" } },
          getTeamLogo: { requestOptions: { responseType: "blob" } },
          getDivisionLogo: { requestOptions: { responseType: "blob" } },
          getMatchDocument: { requestOptions: { responseType: "blob" } },
          getAccountPhoto: { requestOptions: { responseType: "blob" } },
        },
        mutator: { path: "src/shared/api/api-fetch.ts", name: "apiFetch" },
        includeZodSchemaInArguments: true,
        zod: { generateEachHttpStatus: true, generate: { query: true } },
        fetch: {
          runtimeValidation: true,
          includeHttpResponseReturnType: false,
        },
      },
    },
  },
});
