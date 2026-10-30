import { createFormControl } from "react-hook-form";
import type { AccountSession } from "../../accounts/current-account";
import type { CreateStreamReportRequest } from "../../../../.generated/schemas/index.zod";

/** RHF retains only the private current-journey draft through temporary F12 route removal. */
interface ReportEditor {
  form: ReturnType<typeof createFormControl<CreateStreamReportRequest>>;
  release(): void;
}
const editors = new Map<string, ReportEditor>();

/** Keeps the exact original-session/version control, never transferring a reason to a replacement. */
export function reportEditor(
  session: AccountSession,
  contributionId: string,
): ReportEditor {
  const key = `${session.generation}:${session.accountId}:${contributionId}`;
  const retained = editors.get(key);
  if (retained) return retained;
  const stop = session.subscribe(() => {
    if (!session.isCurrent(session.generation)) {
      editor.form.reset({ reason: "" });
      editor.release();
    }
  });
  const editor: ReportEditor = {
    form: createFormControl<CreateStreamReportRequest>({
      defaultValues: { reason: "" },
    }),
    /** Releases only this registration; session invalidation also clears its private values. */
    release() {
      if (editors.get(key) === editor) editors.delete(key);
      stop();
    },
  };
  editors.set(key, editor);
  return editor;
}
