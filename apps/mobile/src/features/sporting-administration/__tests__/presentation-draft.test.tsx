import { act, renderHook } from "@testing-library/react-native";
import { File } from "expo-file-system";
import { usePresentationDraft } from "../forms/use-presentation-draft";

jest.mock("expo-file-system", () => ({
  File: class {
    exists = true;
    uri: string;

    /** Represents the app-owned cache copy without invoking native disk I/O. */
    constructor(uri: string) {
      this.uri = uri;
    }

    /** Releases only this controlled owned copy. */
    delete() {
      this.exists = false;
    }
  },
}));
jest.mock("@sentry/react-native", () => ({ captureException: jest.fn() }));

it("keeps the submitted file until upload settlement after route removal", async () => {
  // Given
  const file = new File("file:///owned-prepared.png");
  const remove = jest.spyOn(file, "delete");
  const { result, unmount } = await renderHook(() =>
    usePresentationDraft({ kind: "division-creation" }),
  );
  await act(async () => {
    result.current.replaceLogo({ action: "replace", prepared: file });
    result.current.beginUpload(file);
  });
  const finish = result.current.finishUpload;

  // When
  await unmount();

  // Then
  expect(remove).not.toHaveBeenCalled();

  // When
  finish(file);

  // Then
  expect(remove).toHaveBeenCalledTimes(1);
});

it("discards to the accepted creation values rather than the empty creation draft", async () => {
  // Given
  const { result } = await renderHook(() =>
    usePresentationDraft({ kind: "division-creation" }),
  );
  const accepted = {
    kind: "division" as const,
    data: {
      id: "00000000-0000-4000-8000-000000000196",
      revision: "d1",
      name: "Accepted division",
      color: "#123456",
      gradient: null,
      logo: { effectiveUrl: null, manualUrl: null, automaticUrl: null },
      active: true,
    },
  };
  await act(async () => {
    result.current.update({ baseline: accepted });
    result.current.reset({
      kind: "division",
      name: accepted.data.name,
      shortName: "",
      color: accepted.data.color,
      gradient: ["", "", ""],
      logo: { action: "keep" },
    });
  });
  await act(async () =>
    result.current.form.setValue("name", "Discarded edit", {
      shouldDirty: true,
    }),
  );

  // When
  await act(async () => result.current.discard());

  // Then
  expect(result.current.form.getValues("name")).toBe("Accepted division");
  expect(result.current.form.getValues("color")).toBe("#123456");
});
