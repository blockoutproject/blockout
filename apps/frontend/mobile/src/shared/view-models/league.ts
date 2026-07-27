/** Identify the national league code used by the current mobile presentation. */
export const isLNV = (code: string): boolean => code.toLowerCase() === "aalnv";

/** Identify league codes presented as regional competitions. */
export const isRegional = (code: string): boolean =>
  !["aalnv", "abccs"].includes(code.toLowerCase());
