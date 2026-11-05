import {
  createStreamReactivation,
  eraseAccount,
  getMaintenanceSettings,
  getMatch,
  getModeratedStreamContribution,
  listModeratedStreamContributions,
  listOwnStreamContributions,
  listStreamReports,
  setMaintenanceActivation,
  updateOwnStreamContribution,
} from "../../../../.generated/mobile";

// Only native networking is replaced. Every admitted request reaches the real Spring provider.
jest.mock("expo/fetch", () => ({
  fetch: async (url: RequestInfo | URL, options?: RequestInit) => {
    const method = options?.method ?? "GET";
    if (method !== "GET") mockWrites.push({ url: String(url), method });
    if (method === "PATCH" && mockDelayedDispatch) {
      const delay = mockDelayedDispatch;
      mockDelayedDispatch = undefined;
      delay.started.resolve();
      await delay.release.promise;
    }
    const response = await jest.requireActual("node-fetch")(url, options);
    if (method === "PATCH" && mockLoseResponse) {
      mockLoseResponse = false;
      await response.arrayBuffer();
      throw new TypeError("Response lost after server commit");
    }
    return response;
  },
}));

let mockLoseResponse = false;
let mockWrites: { url: string; method: string }[] = [];
let mockDelayedDispatch:
  | {
      started: ReturnType<typeof Promise.withResolvers<void>>;
      release: ReturnType<typeof Promise.withResolvers<void>>;
    }
  | undefined;
const previousApi = process.env.EXPO_PUBLIC_API_URL;
const provider = process.env.BLOCKOUT_CONTRIBUTION_PROVIDER_URL;
const suite = provider ? describe : describe.skip;

suite("generated contribution consumers over actual account erasure", () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = provider;
    mockLoseResponse = false;
    mockWrites = [];
    mockDelayedDispatch = undefined;
  });

  afterEach(() => {
    mockDelayedDispatch?.release.resolve();
    if (previousApi === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = previousApi;
  });

  it("retains anonymous useful history after a lost response and a delayed old owner command", async () => {
    // Given: the Java owner creates both versions and reports through the actual business commands.
    const matchId = process.env.BLOCKOUT_CONTRIBUTION_MATCH_ID ?? "";
    const sourceId = process.env.BLOCKOUT_CONTRIBUTION_SOURCE_ID ?? "";
    const selectedId = process.env.BLOCKOUT_CONTRIBUTION_SELECTED_ID ?? "";
    const authorId = process.env.BLOCKOUT_CONTRIBUTION_AUTHOR_ID ?? "";
    const reporterId = process.env.BLOCKOUT_CONTRIBUTION_REPORTER_ID ?? "";
    const moderatorId = process.env.BLOCKOUT_CONTRIBUTION_MODERATOR_ID ?? "";
    const author = {
      headers: {
        Authorization: `Bearer ${process.env.BLOCKOUT_CONTRIBUTION_AUTHOR_TOKEN ?? ""}`,
      },
    };
    const reporter = {
      headers: {
        Authorization: `Bearer ${process.env.BLOCKOUT_CONTRIBUTION_REPORTER_TOKEN ?? ""}`,
      },
    };
    const moderator = {
      headers: {
        Authorization: `Bearer ${process.env.BLOCKOUT_CONTRIBUTION_MODERATOR_TOKEN ?? ""}`,
      },
    };
    const observer = {
      headers: {
        Authorization: `Bearer ${process.env.BLOCKOUT_CONTRIBUTION_OBSERVER_TOKEN ?? ""}`,
      },
    };
    const initial = await listModeratedStreamContributions(
      matchId,
      undefined,
      observer,
    );
    expect(initial.activeContribution?.id).toBe(selectedId);
    const originalSource = await getModeratedStreamContribution(
      matchId,
      sourceId,
      observer,
    );
    const originalReports = await listStreamReports(
      matchId,
      sourceId,
      undefined,
      observer,
    );
    expect(originalSource.contribution).toMatchObject({
      state: "hidden",
      reportCount: 3,
    });
    expect(originalReports.count).toBe(3);
    expect(
      originalReports.items.every((report) => report.reason !== null),
    ).toBe(true);
    mockLoseResponse = true;

    // When
    await expect(
      updateOwnStreamContribution(
        authorId,
        matchId,
        selectedId,
        { action: "withdraw", revision: initial.revision },
        author,
      ),
    ).rejects.toMatchObject({ kind: "network" });
    const withdrawn = await getModeratedStreamContribution(
      matchId,
      selectedId,
      observer,
    );

    // Then: a current read proves the current state, without reconstructing the lost response.
    expect(withdrawn.contribution.state).toBe("withdrawn");
    expect(withdrawn.revision).not.toBe(initial.revision);
    expect(mockWrites).toHaveLength(1);

    // When: a separate deliberate decision selects a historical source using the viewed revision.
    const reactivated = await createStreamReactivation(
      matchId,
      sourceId,
      { actorAccountId: moderatorId, revision: withdrawn.revision },
      moderator,
    );
    await expect(
      updateOwnStreamContribution(
        authorId,
        matchId,
        selectedId,
        { action: "withdraw", revision: initial.revision },
        author,
      ),
    ).rejects.toMatchObject({
      status: 409,
      problem: { type: "urn:blockout:problem:stale-revision" },
    });
    const beforeErasure = await listModeratedStreamContributions(
      matchId,
      undefined,
      observer,
    );
    const selectedBeforeErasure = await getModeratedStreamContribution(
      matchId,
      selectedId,
      observer,
    );

    // Then
    expect(beforeErasure.activeContribution?.id).toBe(
      reactivated.contribution.id,
    );
    expect(reactivated.contribution.sourceVersionId).toBe(sourceId);
    expect(reactivated.contribution.authorName).toBeDefined();
    expect(mockWrites).toHaveLength(3);

    // Given: the next original-owner command has been captured but has not reached the server.
    const delay = {
      started: Promise.withResolvers<void>(),
      release: Promise.withResolvers<void>(),
    };
    mockDelayedDispatch = delay;
    const lateOwnerCommand = updateOwnStreamContribution(
      authorId,
      matchId,
      reactivated.contribution.id,
      { action: "withdraw", revision: reactivated.revision },
      author,
    ).catch((error: unknown) => error);
    await delay.started.promise;

    // When
    try {
      await eraseAccount(authorId, author);
      await eraseAccount(reporterId, reporter);
      await eraseAccount(moderatorId, moderator);
    } finally {
      delay.release.resolve();
    }

    // Then: erasure is authoritative when the delayed original actor finally reaches admission.
    await expect(lateOwnerCommand).resolves.toMatchObject({ status: 403 });
    await expect(
      listOwnStreamContributions(authorId, matchId, undefined, author),
    ).rejects.toMatchObject({ status: 403 });
    const current = await listModeratedStreamContributions(
      matchId,
      undefined,
      observer,
    );
    const source = await getModeratedStreamContribution(
      matchId,
      sourceId,
      observer,
    );
    const selected = await getModeratedStreamContribution(
      matchId,
      selectedId,
      observer,
    );
    const reports = await listStreamReports(
      matchId,
      sourceId,
      undefined,
      observer,
    );
    const publicMatch = await getMatch(matchId);
    expect(current.revision).toBe(beforeErasure.revision);
    expect(current.counts).toEqual(beforeErasure.counts);
    expect(current.approvalRequiredAfterReports).toBe(
      beforeErasure.approvalRequiredAfterReports,
    );
    expect(current.activeContribution).toMatchObject({
      id: reactivated.contribution.id,
      state: "active",
      sourceVersionId: sourceId,
      reportCount: 0,
    });
    expect(current.activeContribution?.authorName).toBeUndefined();
    expect(current.activeContribution?.decisions).toEqual(
      reactivated.contribution.decisions.map(({ kind, at }) => ({ kind, at })),
    );
    expect(source.contribution).toMatchObject({
      id: sourceId,
      state: "hidden",
      reportCount: 3,
      url: originalSource.contribution.url,
    });
    expect(source.contribution.authorName).toBeUndefined();
    expect(source.contribution.decisions).toEqual(
      originalSource.contribution.decisions.map(({ kind, at }) => ({
        kind,
        at,
      })),
    );
    expect(selected.contribution.state).toBe("withdrawn");
    expect(selected.contribution.decisions).toEqual(
      selectedBeforeErasure.contribution.decisions.map(({ kind, at }) => ({
        kind,
        at,
      })),
    );
    expect(reports.count).toBe(3);
    expect(
      reports.items.map(({ id, reportedAt }) => ({ id, reportedAt })),
    ).toEqual(
      originalReports.items.map(({ id, reportedAt }) => ({ id, reportedAt })),
    );
    expect(
      reports.items.filter((report) => report.reason === null),
    ).toHaveLength(1);
    expect(publicMatch).toMatchObject({
      streamContributionId: reactivated.contribution.id,
      streamUrl: originalSource.contribution.url,
    });
    expect(publicMatch).not.toHaveProperty("authorName");
    expect(publicMatch).not.toHaveProperty("decisions");
    expect(publicMatch).not.toHaveProperty("reports");
    expect(mockWrites.map(({ method }) => method)).toEqual([
      "PATCH",
      "POST",
      "PATCH",
      "PATCH",
      "DELETE",
      "DELETE",
      "DELETE",
    ]);

    // When: F12 changes current admission after erasure; the observer's stream grant is no bypass.
    const maintenance = await getMaintenanceSettings(observer);
    const activeMaintenance = await setMaintenanceActivation(
      { revision: maintenance.revision, active: true },
      observer,
    );
    try {
      // Then
      await expect(getMatch(matchId)).rejects.toMatchObject({
        status: 503,
        problem: { type: "urn:blockout:problem:maintenance" },
      });
      await expect(
        listModeratedStreamContributions(matchId, undefined, observer),
      ).rejects.toMatchObject({
        status: 503,
        problem: { type: "urn:blockout:problem:maintenance" },
      });
    } finally {
      await setMaintenanceActivation(
        { revision: activeMaintenance.revision, active: false },
        observer,
      );
    }

    // When
    const admittedAgain = await getMatch(matchId);

    // Then
    expect(admittedAgain.streamContributionId).toBe(
      reactivated.contribution.id,
    );
  });
});
