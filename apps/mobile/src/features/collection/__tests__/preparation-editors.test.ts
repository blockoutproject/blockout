import type {
  CollectionSeasonResponse,
  SourceBindingResponse,
} from "../../../../.generated/schemas/index.zod";
import { createSessionGeneration } from "../../accounts/session/session-generation";
import {
  discardProviderPreparationEditor,
  discardSourcePreparationEditor,
  providerPreparationEditor,
  sourcePreparationEditor,
} from "../forms/preparation-editors";

const season: CollectionSeasonResponse = {
  id: "00000000-0000-4000-8000-000000000179",
  label: "2026/2027",
  startYear: 2026,
  revision: 5,
  state: "active",
};
const candidateUrl =
  "https://lnv-web.dataproject.com/CompetitionMatches.aspx?ID=137";
const source: SourceBindingResponse = {
  id: "00000000-0000-4000-8000-000000000180",
  seasonId: season.id,
  provider: "lnv",
  organizerReference: "137",
  label: "D1 masculine",
  revision: 2,
  candidateUrl,
  acceptedUrl: null,
  locked: false,
  launched: false,
  validation: "unvalidated",
  validatedAt: null,
  seasonEvidence: null,
  reason: null,
};
afterEach(() => {
  discardProviderPreparationEditor();
  discardSourcePreparationEditor();
});

it.each(["explicit discard", "new session", "other account"])(
  "does not restore source or provider drafts after %s",
  (boundary) => {
    // Given
    const session = createSessionGeneration();
    const accountId = "00000000-0000-4000-8000-000000000181";
    session.setAccount(session.getSnapshot().generation, accountId);
    const captured = { ...session, ...session.getSnapshot() };
    const sourceDraft = sourcePreparationEditor(captured, source);
    const providerDraft = providerPreparationEditor(captured, season, "lnv");
    const stopSource = sourceDraft.form.subscribe({
      formState: { values: true },
      callback: () => {},
    });
    const stopProvider = providerDraft.form.subscribe({
      formState: { values: true },
      callback: () => {},
    });
    sourceDraft.form.setValue("candidateUrl", `${candidateUrl}&PID=192`, {
      shouldDirty: true,
    });
    providerDraft.form.setValue("organizerReference", "137", {
      shouldDirty: true,
    });
    providerDraft.update({
      ...providerDraft.getSnapshot(),
      selected: [source.id],
      needsRead: true,
    });

    // When
    if (boundary === "explicit discard") {
      discardSourcePreparationEditor();
      discardProviderPreparationEditor();
    } else if (boundary === "new session") {
      session.invalidate();
      session.setAccount(session.getSnapshot().generation, accountId);
    } else
      session.setAccount(
        session.getSnapshot().generation,
        "00000000-0000-4000-8000-000000000182",
      );
    const nextSession = { ...session, ...session.getSnapshot() };
    const nextSource = sourcePreparationEditor(nextSession, source);
    const nextProvider = providerPreparationEditor(nextSession, season, "lnv");

    // Then
    expect(nextSource.form.getValues("candidateUrl")).toBe(candidateUrl);
    expect(nextProvider.form.getValues("organizerReference")).toBe("");
    expect(nextProvider.getSnapshot().selected).toBeNull();
    expect(nextProvider.getSnapshot().needsRead).toBe(false);
    stopSource();
    stopProvider();
    session.invalidate();
  },
);
