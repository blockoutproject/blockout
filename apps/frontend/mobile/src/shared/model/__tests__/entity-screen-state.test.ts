import { getEntityScreenState } from "@/src/shared/model/entity-screen-state";

describe("getEntityScreenState", () => {
  it.each([
    [{ entity: undefined, error: null, isLoading: true }, "loading"],
    [
      { entity: undefined, error: new Error("failed"), isLoading: false },
      "error",
    ],
    [{ entity: undefined, error: null, isLoading: false }, "not-found"],
    [{ entity: { id: 1 }, error: null, isLoading: false }, "ready"],
  ] as const)("maps query facts to the expected state", (input, expected) => {
    expect(getEntityScreenState(input)).toBe(expected);
  });
});
