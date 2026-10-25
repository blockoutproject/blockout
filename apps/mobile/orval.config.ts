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
              path: "src/features/sporting-administration/api/presentation-form-data.ts",
              name: "presentationFormData",
            },
          },
          setTeamPresentation: {
            formData: {
              path: "src/features/sporting-administration/api/presentation-form-data.ts",
              name: "presentationFormData",
            },
          },
          createDivision: {
            formData: {
              path: "src/features/sporting-administration/api/presentation-form-data.ts",
              name: "presentationFormData",
            },
          },
          setDivisionPresentation: {
            formData: {
              path: "src/features/sporting-administration/api/presentation-form-data.ts",
              name: "presentationFormData",
            },
          },
          changeAccountProfile: {
            formData: {
              path: "src/features/accounts/api/profile-form-data.ts",
              name: "profileFormData",
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
