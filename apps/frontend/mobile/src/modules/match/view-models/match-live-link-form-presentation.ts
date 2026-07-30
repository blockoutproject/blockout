export type MatchLiveLinkFormPresentation = {
  isLocked: boolean;
  showReplayWarning: boolean;
  subtitle: string;
  title: string;
};

/**
 * Derives live-link form copy and availability from the match state.
 */
export function createMatchLiveLinkFormPresentation({
  hasExisting,
  isBeforeLiveWindow,
  isMatchFinished,
  isModerator,
}: {
  hasExisting: boolean;
  isBeforeLiveWindow: boolean;
  isMatchFinished: boolean;
  isModerator: boolean;
}): MatchLiveLinkFormPresentation {
  let title = "Ajouter un lien de live";

  if (hasExisting && isMatchFinished) {
    title = "Mettre à jour la rediffusion";
  } else if (!hasExisting && isMatchFinished) {
    title = "Ajouter une rediffusion";
  } else if (hasExisting) {
    title = "Mettre à jour le lien du live";
  }

  return {
    isLocked: isBeforeLiveWindow && !isModerator,
    showReplayWarning: isMatchFinished,
    subtitle: isMatchFinished
      ? "Colle ici un lien YouTube, Twitch ou Facebook vers la rediffusion. Il sera vérifié avant d’être visible sur la fiche du match."
      : "Colle ici un lien YouTube, Twitch ou Facebook pour partager ce match en direct.",
    title,
  };
}
