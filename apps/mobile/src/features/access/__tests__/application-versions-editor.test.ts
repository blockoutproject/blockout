import { createSessionGeneration } from "../../accounts/session/session-generation";
import { applicationAccessResponse } from "../../../shared/api/test-support/application-access";
import {
  applicationVersionsEditor,
  discardApplicationVersionsEditor,
} from "../forms/application-versions-editor";

afterEach(discardApplicationVersionsEditor);

it.each(["explicit discard", "new session", "other account"])(
  "does not restore a retained draft after %s",
  (boundary) => {
    // Given
    const session = createSessionGeneration();
    const accountId = "00000000-0000-4000-8000-000000000185";
    session.setAccount(session.getSnapshot().generation, accountId);
    const stored = {
      ...applicationAccessResponse().versions,
      message: "Stored message",
    };
    const draft = applicationVersionsEditor(
      { ...session, ...session.getSnapshot() },
      stored,
    );
    const stop = draft.form.subscribe({
      formState: { values: true },
      callback: () => {},
    });
    draft.form.setValue("message", "Private draft", { shouldDirty: true });
    expect(draft.form.getValues("message")).toBe("Private draft");

    // When
    if (boundary === "explicit discard") discardApplicationVersionsEditor();
    else if (boundary === "new session") {
      session.invalidate();
      session.setAccount(session.getSnapshot().generation, accountId);
    } else
      session.setAccount(
        session.getSnapshot().generation,
        "00000000-0000-4000-8000-000000000186",
      );
    const next = applicationVersionsEditor(
      { ...session, ...session.getSnapshot() },
      stored,
    );

    // Then
    expect(next.form.getValues("message")).toBe("Stored message");
    stop();
    session.invalidate();
  },
);
