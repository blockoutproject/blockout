import React from "react";
import { render } from "@testing-library/react-native";
import { TextInput } from "react-native";

import { ThemeProvider } from "@/src/shared/theme";
import { FormField } from "@/src/shared/ui/form/form-field";

describe("FormField", () => {
  it("shows validation feedback only after the field is touched", async () => {
    const untouched = await render(
      <ThemeProvider>
        <FormField label="Nom" error="Le nom est requis" touched={false}>
          <TextInput accessibilityLabel="Nom" />
        </FormField>
      </ThemeProvider>,
    );

    expect(untouched.queryByText("Le nom est requis")).toBeNull();

    const touched = await render(
      <ThemeProvider>
        <FormField label="Nom" error="Le nom est requis" touched>
          <TextInput accessibilityLabel="Nom" />
        </FormField>
      </ThemeProvider>,
    );

    expect(touched.getByText("Le nom est requis")).toBeTruthy();
  });
});
