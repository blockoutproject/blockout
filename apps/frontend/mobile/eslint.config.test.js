const path = require("node:path");

const { ESLint } = require("eslint");

const mobileConfig = require("./eslint.config");

const mobileRoot = __dirname;
const lintProbePath = path.join(mobileRoot, "src/lint-probe.tsx");

describe("mobile ESLint visual token boundary", () => {
  it("rejects raw colors and accepts canonical token references", async () => {
    const eslint = new ESLint({
      cwd: mobileRoot,
      overrideConfig: mobileConfig,
      overrideConfigFile: true,
    });

    const [rawColorResult] = await eslint.lintText(
      `
        import { StyleSheet } from "react-native";

        export const rawColorStyle = StyleSheet.create({
          label: { color: "#ffffff" },
        });
      `,
      { filePath: lintProbePath },
    );
    const [tokenResult] = await eslint.lintText(
      `
        import { StyleSheet } from "react-native";

        import { colors } from "@/src/shared/theme";

        export const tokenStyle = StyleSheet.create({
          label: { color: colors.text.primary },
        });
      `,
      { filePath: lintProbePath },
    );

    expect(rawColorResult.messages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ruleId: "react-native/no-color-literals",
          severity: 2,
        }),
      ]),
    );
    expect(
      tokenResult.messages.filter(
        ({ ruleId }) => ruleId === "react-native/no-color-literals",
      ),
    ).toHaveLength(0);
  });
});
