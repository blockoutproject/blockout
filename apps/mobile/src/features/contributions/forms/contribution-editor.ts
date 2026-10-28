import { createFormControl } from "react-hook-form";
import type { AccountSession } from "../../accounts/current-account";
import type { ContributionValues } from "../schemas/contribution-schema";
import { contributionValues } from "./contribution-values";

/** RHF alone retains the original match draft through temporary protected-route removal. */
interface ContributionEditor {
  form: ReturnType<typeof createFormControl<ContributionValues>>;
  /** Releases this exact retained control; mounted callers own their explicit accepted/discarded reset. */
  release(): void;
}
const editors = new Map<string, ContributionEditor>();

/** Keeps only the current session's address control; Query retains commands and generated responses separately. */
export function contributionEditor(
  session: AccountSession,
  matchId: string,
): ContributionEditor {
  const key = `${session.generation}:${session.accountId}:${matchId}`;
  const retained = editors.get(key);
  if (retained) return retained;
  const stop = session.subscribe(() => {
    if (!session.isCurrent(session.generation)) {
      editor.form.reset(contributionValues());
      editor.release();
    }
  });
  const editor: ContributionEditor = {
    form: createFormControl<ContributionValues>({
      defaultValues: contributionValues(),
    }),
    /** A late completion cannot release a replacement draft for the same original match. */
    release() {
      if (editors.get(key) === editor) editors.delete(key);
      stop();
    },
  };
  editors.set(key, editor);
  return editor;
}
