import { ApiError } from "@/src/shared/api/api-error";
import { createMatchLiveLinkCardPresentation } from "@/src/modules/match/view-models/match-live-link-card-presentation";
import { getMatchLiveLinkErrorMessage } from "@/src/modules/match/view-models/match-live-link-errors";
import { createMatchLiveLinkFormPresentation } from "@/src/modules/match/view-models/match-live-link-form-presentation";

const noScopes = {
  canCreate: false,
  canDelete: false,
  canModerate: false,
  canReport: false,
};

const upcomingMatch = {
  liveOwnerAuth0Id: null,
  liveProvider: null,
  liveUrl: null,
  matchDate: "2026-04-25T18:30:00Z",
  status: "UPCOMING" as const,
};

describe("match live-link presentation", () => {
  it("keeps the guest authentication CTA visible without exposing commands", () => {
    const presentation = createMatchLiveLinkCardPresentation({
      isGuest: true,
      match: upcomingMatch,
      now: new Date("2026-04-25T16:00:00Z"),
      scopes: noScopes,
    });

    expect(presentation).toMatchObject({
      canCreateLiveLink: false,
      canShowEmptyStateCta: true,
      emptyStateLabel: "Vous diffusez ce match ?",
      isBeforeLiveWindow: true,
      shouldShowCard: true,
      showReportButton: false,
    });
  });

  it("exposes owner edit/delete actions while keeping owner reporting hidden", () => {
    const presentation = createMatchLiveLinkCardPresentation({
      isGuest: false,
      match: {
        ...upcomingMatch,
        liveOwnerAuth0Id: "owner",
        liveProvider: "YOUTUBE",
        liveUrl: "https://youtube.com/watch?v=blockout",
      },
      now: new Date("2026-04-25T18:00:00Z"),
      scopes: {
        ...noScopes,
        canCreate: true,
        canDelete: true,
        canReport: true,
      },
      userAuth0Id: "owner",
    });

    expect(presentation).toMatchObject({
      canDeleteLiveLink: true,
      canEditExistingLink: true,
      canReportLiveLink: false,
      leftIcon: "youtube",
      liveLabel: "Regarder le live sur YouTube",
      showReportButton: false,
    });
  });

  it("derives replay and reporting states for a non-owner", () => {
    const presentation = createMatchLiveLinkCardPresentation({
      isGuest: false,
      match: {
        ...upcomingMatch,
        liveOwnerAuth0Id: "owner",
        liveProvider: "TWITCH",
        liveUrl: "https://twitch.tv/blockout",
        status: "FINISHED",
      },
      scopes: { ...noScopes, canReport: true },
      userAuth0Id: "viewer",
    });

    expect(presentation).toMatchObject({
      canReportLiveLink: true,
      headerTitle: "Rediffusion",
      isFinished: true,
      isLive: false,
      liveLabel: "Regarder la rediffusion",
      showReportButton: true,
    });
  });

  it("derives all live-link form modes and lock behavior", () => {
    expect(
      createMatchLiveLinkFormPresentation({
        hasExisting: false,
        isBeforeLiveWindow: true,
        isMatchFinished: false,
        isModerator: false,
      }),
    ).toMatchObject({
      isLocked: true,
      showReplayWarning: false,
      title: "Ajouter un lien de live",
    });
    expect(
      createMatchLiveLinkFormPresentation({
        hasExisting: true,
        isBeforeLiveWindow: false,
        isMatchFinished: true,
        isModerator: false,
      }),
    ).toMatchObject({
      isLocked: false,
      showReplayWarning: true,
      title: "Mettre à jour la rediffusion",
    });
  });

  it("owns shared live-link API error mapping with command fallbacks", () => {
    expect(getMatchLiveLinkErrorMessage(new ApiError(503, "Unavailable"))).toBe(
      "Le serveur rencontre un problème, réessaie dans quelques instants.",
    );
    expect(getMatchLiveLinkErrorMessage(new ApiError(400, "Lien refusé"))).toBe(
      "Lien refusé",
    );
    expect(
      getMatchLiveLinkErrorMessage(
        new ApiError(400, ""),
        "Impossible de signaler ce lien.",
      ),
    ).toBe("Impossible de signaler ce lien.");
    expect(getMatchLiveLinkErrorMessage(new Error("Failure"))).toBe(
      "Action impossible, réessaie.",
    );
  });
});
