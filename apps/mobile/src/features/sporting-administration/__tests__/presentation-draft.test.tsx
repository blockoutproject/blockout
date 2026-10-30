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
    usePresentationDraft({ kind: "division-creation", data: { items: [] } }),
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
