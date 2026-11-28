import type { ExampleValues } from "../schemas/example-schema";

/** Starts both qualification fields empty so validation remains observable. */
export function exampleValues(): ExampleValues {
  return { name: "", last: "" };
}
