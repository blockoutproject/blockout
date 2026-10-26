import type { AgeValues } from "../schemas/age-schema";

/** Every new declaration requires a fresh explicit selection; raw age is never restored. */
export function ageValues(): AgeValues {
  return { age: null };
}
