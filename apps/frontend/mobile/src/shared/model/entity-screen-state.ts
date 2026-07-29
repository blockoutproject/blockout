export type EntityScreenState = "loading" | "error" | "not-found" | "ready";

type EntityScreenStateInput<T> = {
  entity: T | null | undefined;
  error: unknown;
  isLoading: boolean;
};

export const getEntityScreenState = <T>({
  entity,
  error,
  isLoading,
}: EntityScreenStateInput<T>): EntityScreenState => {
  if (isLoading) return "loading";
  if (error) return "error";
  if (!entity) return "not-found";
  return "ready";
};
