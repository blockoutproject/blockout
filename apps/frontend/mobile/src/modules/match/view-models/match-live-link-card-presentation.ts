import type {
  LiveProviderEnum,
  MatchStatusEnum,
} from "@/src/shared/generated/models";
import { LIVE_PROVIDER_LABELS } from "@/src/modules/match/view-models/live-provider-labels";

type LiveLinkCardMatch = {
  liveOwnerAuth0Id?: string | null;
  liveProvider?: LiveProviderEnum | null;
  liveUrl?: string | null;
  matchDate: string;
  status: MatchStatusEnum;
};

export type MatchLiveLinkCardScopes = {
  canCreate: boolean;
  canDelete: boolean;
  canModerate: boolean;
  canReport: boolean;
};

export type MatchLiveLinkCardPresentation = {
  canCreateLiveLink: boolean;
  canDeleteLiveLink: boolean;
  canEditExistingLink: boolean;
  canReportLiveLink: boolean;
  canShowEmptyStateCta: boolean;
  emptyStateLabel: string;
  hasLiveLink: boolean;
  headerTitle: string;
  isBeforeLiveWindow: boolean;
  isFinished: boolean;
  isLive: boolean;
  isOwner: boolean;
  leftIcon: "facebook" | "play-circle-outline" | "twitch" | "youtube";
  liveLabel: string;
  shouldShowCard: boolean;
  showReportButton: boolean;
};

/**
 * Derives live-link visibility, permissions, and copy without coupling the card
 * layout to session or authorization providers.
 */
export function createMatchLiveLinkCardPresentation({
  isGuest,
  match,
  now = new Date(),
  scopes,
  userAuth0Id,
}: {
  isGuest: boolean;
  match: LiveLinkCardMatch;
  now?: Date;
  scopes: MatchLiveLinkCardScopes;
  userAuth0Id?: string | null;
}): MatchLiveLinkCardPresentation {
  const hasLiveLink = Boolean(match.liveUrl);
  const isFinished = match.status === "FINISHED";
  const isLive = hasLiveLink && !isFinished;
  const isOwner = Boolean(
    userAuth0Id &&
    match.liveOwnerAuth0Id &&
    match.liveOwnerAuth0Id === userAuth0Id,
  );
  const matchDate = match.matchDate ? new Date(match.matchDate) : null;
  const isBeforeLiveWindow = Boolean(
    matchDate && now < new Date(matchDate.getTime() - 60 * 60 * 1000),
  );
  const canCreateLiveLink = !hasLiveLink && scopes.canCreate;
  const canEditExistingLink =
    hasLiveLink && (scopes.canModerate || (isOwner && scopes.canCreate));
  const canDeleteLiveLink =
    hasLiveLink && (scopes.canModerate || (isOwner && scopes.canDelete));
  const canReportLiveLink = hasLiveLink && !isOwner && scopes.canReport;
  const showReportButton = canReportLiveLink || (hasLiveLink && isGuest);
  const providerLabel = match.liveProvider
    ? (LIVE_PROVIDER_LABELS[match.liveProvider] ?? "")
    : "";
  const liveLabel = isFinished
    ? "Regarder la rediffusion"
    : providerLabel
      ? `Regarder le live sur ${providerLabel}`
      : "Regarder le live";
  const emptyStateLabel = isFinished
    ? "Ajouter un lien de rediffusion"
    : "Vous diffusez ce match ?";
  const canShowEmptyStateCta = !hasLiveLink && (canCreateLiveLink || isGuest);

  let leftIcon: MatchLiveLinkCardPresentation["leftIcon"];
  switch (match.liveProvider) {
    case "YOUTUBE":
      leftIcon = "youtube";
      break;
    case "TWITCH":
      leftIcon = "twitch";
      break;
    case "FACEBOOK":
      leftIcon = "facebook";
      break;
    default:
      leftIcon = "play-circle-outline";
  }

  return {
    canCreateLiveLink,
    canDeleteLiveLink,
    canEditExistingLink,
    canReportLiveLink,
    canShowEmptyStateCta,
    emptyStateLabel,
    hasLiveLink,
    headerTitle: isFinished ? "Rediffusion" : "Live",
    isBeforeLiveWindow,
    isFinished,
    isLive,
    isOwner,
    leftIcon,
    liveLabel,
    shouldShowCard: hasLiveLink || canShowEmptyStateCta,
    showReportButton,
  };
}
