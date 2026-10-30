import { act, renderHook } from "@testing-library/react-native";
import type { ApplicationVersionsResponse } from "../../../../.generated/schemas/index.zod";
import { useApplicationVersionsDraft } from "../forms/use-application-versions-draft";

const initial: ApplicationVersionsResponse = {
  revision: 5,
  ios: { minimumVersion: null, storeUrl: null },
  android: { minimumVersion: null, storeUrl: null },
  message: null,
};

it("keeps dirty input attributed to its original revision after a background read", async () => {
  // Given
  const { result, rerender } = await renderHook(
    ({ settings }: { settings: ApplicationVersionsResponse }) =>
      useApplicationVersionsDraft(settings),
    { initialProps: { settings: initial } },
  );
  await act(async () => {
    result.current.form.setValue("message", "My draft", { shouldDirty: true });
  });

  // When
  await rerender({
    settings: { ...initial, revision: 6, message: "Other edit" },
  });

  // Then
  expect(result.current.state.baseline.revision).toBe(5);
  expect(result.current.form.getValues("message")).toBe("My draft");
});

it("opens a fresh server-backed draft after the editing route was removed", async () => {
  // Given
  const first = await renderHook(() => useApplicationVersionsDraft(initial));
  await act(async () => {
    first.result.current.form.setValue("message", "Abandoned draft");
  });
  await first.unmount();

  // When
  const next = await renderHook(() =>
    useApplicationVersionsDraft({
      ...initial,
      revision: 6,
      message: "Current server value",
    }),
  );

  // Then
  expect(next.result.current.state.baseline.revision).toBe(6);
  expect(next.result.current.form.getValues("message")).toBe(
    "Current server value",
  );
});
