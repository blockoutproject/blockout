import type {
  CollectionSeasonResponse,
  SourceBindingResponse,
} from "../../../../.generated/schemas/index.zod";
import { createSessionGeneration } from "../../accounts/session/session-generation";
import {
  discardSourcePreparationEditor,
  sourcePreparationEditor,
} from "../forms/source-candidate-editor";
import {
  discardProviderPreparationEditor,
  providerPreparationEditor,
} from "../forms/provider-preparation-editor";

import {
  closeSeasonEditor,
  discardCloseSeasonEditor,
} from "../forms/close-season-editor";

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
  discardCloseSeasonEditor();
});

it.each(["explicit discard", "new session", "other account"])(
  "clears source, provider and closure drafts after %s",
  (boundary) => {
    // Given
    const session = createSessionGeneration();
    const accountId = "00000000-0000-4000-8000-000000000181";
    session.setAccount(session.getSnapshot().generation, accountId);
    const captured = { ...session, ...session.getSnapshot() };
    const sourceDraft = sourcePreparationEditor(captured, source);
    const providerDraft = providerPreparationEditor(captured, season, "lnv");
    const closureDraft = closeSeasonEditor(captured, season);
    const stopSource = sourceDraft.form.subscribe({
      formState: { values: true },
      callback: () => {},
    });
    const stopProvider = providerDraft.form.subscribe({
      formState: { values: true },
      callback: () => {},
    });
    const stopClosure = closureDraft.form.subscribe({
      formState: { values: true },
      callback: () => {},
    });
    closureDraft.form.setValue("confirmation", "2026/", { shouldDirty: true });
    sourceDraft.form.setValue("candidateUrl", `${candidateUrl}&PID=192`, {
      shouldDirty: true,
    });
    providerDraft.form.setValue("organizerReference", "137", {
      shouldDirty: true,
    });
    providerDraft.update({
      ...providerDraft.getSnapshot(),
      selected: [source.id],
    });

    // When
    if (boundary === "explicit discard") {
      sourceDraft.discard();
      providerDraft.discard();
      closureDraft.discard();
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
    const nextClosure = closeSeasonEditor(nextSession, season);

    // Then
    expect(sourceDraft.form.getValues("candidateUrl")).toBe(candidateUrl);
    expect(providerDraft.form.getValues("organizerReference")).toBe("");
    expect(closureDraft.form.getValues("confirmation")).toBe("");
    expect(nextClosure.form.getValues("confirmation")).toBe("");
    expect(nextSource.form.getValues("candidateUrl")).toBe(candidateUrl);
    expect(nextProvider.form.getValues("organizerReference")).toBe("");
    expect(nextProvider.getSnapshot().selected).toBeNull();
    stopSource();
    stopProvider();
    stopClosure();
    session.invalidate();
  },
);

it("keeps replacement drafts when an abandoned owner is discarded again", () => {
  // Given: native departure callbacks can still retain an obsolete editor after a fresh draft opens.
  const session = createSessionGeneration();
  session.setAccount(
    session.getSnapshot().generation,
    "00000000-0000-4000-8000-000000000181",
  );
  const captured = { ...session, ...session.getSnapshot() };
  const oldSource = sourcePreparationEditor(captured, source);
  const oldProvider = providerPreparationEditor(captured, season, "lnv");
  const oldClosure = closeSeasonEditor(captured, season);
  oldSource.discard();
  oldProvider.discard();
  oldClosure.discard();
  const replacementSource = sourcePreparationEditor(captured, source);
  const replacementProvider = providerPreparationEditor(
    captured,
    season,
    "lnv",
  );
  const replacementClosure = closeSeasonEditor(captured, season);
  const stopSource = replacementSource.form.subscribe({
    formState: { values: true },
    callback: () => {},
  });
  const stopProvider = replacementProvider.form.subscribe({
    formState: { values: true },
    callback: () => {},
  });
  const stopClosure = replacementClosure.form.subscribe({
    formState: { values: true },
    callback: () => {},
  });
  replacementSource.form.setValue("candidateUrl", `${candidateUrl}&PID=192`, {
    shouldDirty: true,
  });
  replacementProvider.form.setValue("organizerReference", "137", {
    shouldDirty: true,
  });
  replacementProvider.update({
    ...replacementProvider.getSnapshot(),
    selected: [source.id],
  });
  replacementClosure.form.setValue("confirmation", "2026/", {
    shouldDirty: true,
  });

  // When
  oldSource.discard();
  oldProvider.discard();
  oldClosure.discard();

  // Then: reentry still binds the replacement's input and exact selected command scope.
  expect(
    sourcePreparationEditor(captured, source).form.getValues("candidateUrl"),
  ).toBe(`${candidateUrl}&PID=192`);
  expect(
    providerPreparationEditor(captured, season, "lnv").form.getValues(
      "organizerReference",
    ),
  ).toBe("137");
  expect(
    providerPreparationEditor(captured, season, "lnv").getSnapshot().selected,
  ).toEqual([source.id]);
  expect(
    closeSeasonEditor(captured, season).form.getValues("confirmation"),
  ).toBe("2026/");
  stopSource();
  stopProvider();
  stopClosure();
  session.invalidate();
});
