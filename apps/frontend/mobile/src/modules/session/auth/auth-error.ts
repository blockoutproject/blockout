export const isAuth0LoginCancellation = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "type" in error &&
  error.type === "USER_CANCELLED";
