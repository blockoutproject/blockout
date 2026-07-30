import type { ComponentProps } from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import type {
  LiveLinkStatusEnum,
  LiveProviderEnum,
  MatchLiveLinkHistoryResponse,
} from "@/src/shared/generated/models";
import type { AppTheme } from "@/src/shared/theme";

type ModerationStatusTone =
  "neutral" | "warning" | "success" | "error" | "inactive";

export type LiveLinkStatusPresentation = {
  label: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
  backgroundColor: string;
  color: string;
};

const STATUS_PRESENTATIONS: Record<
  LiveLinkStatusEnum,
  {
    label: string;
    icon: ComponentProps<typeof MaterialCommunityIcons>["name"];
    tone: ModerationStatusTone;
  }
> = {
  PENDING: {
    label: "En attente",
    icon: "clock-outline",
    tone: "warning",
  },
  ACTIVE: {
    label: "Actif",
    icon: "check-circle-outline",
    tone: "success",
  },
  REJECTED: {
    label: "Rejeté",
    icon: "close-circle-outline",
    tone: "error",
  },
  DEACTIVATED: {
    label: "Désactivé",
    icon: "eye-off-outline",
    tone: "inactive",
  },
  BANNED: {
    label: "Banni",
    icon: "block-helper",
    tone: "error",
  },
  EXPIRED: {
    label: "Expiré",
    icon: "timer-off-outline",
    tone: "neutral",
  },
};

/**
 * Resolves semantic moderation tones through the active application theme.
 */
function getToneColors(theme: AppTheme, tone: ModerationStatusTone) {
  switch (tone) {
    case "warning":
      return {
        backgroundColor: theme.surfaceSecondary,
        color: theme.warning,
      };
    case "success":
      return {
        backgroundColor: theme.surfaceSecondary,
        color: theme.success,
      };
    case "error":
      return {
        backgroundColor: theme.surfaceSecondary,
        color: theme.error,
      };
    case "inactive":
      return {
        backgroundColor: theme.surfaceSecondary,
        color: theme.textInactive,
      };
    default:
      return {
        backgroundColor: theme.borderSecondary,
        color: theme.text,
      };
  }
}

/**
 * Maps an API live-link status to the label, icon, and theme colors used by
 * moderation surfaces.
 */
export function getLiveLinkStatusPresentation(
  status: LiveLinkStatusEnum | null | undefined,
  theme: AppTheme,
): LiveLinkStatusPresentation {
  const presentation = status ? STATUS_PRESENTATIONS[status] : undefined;

  if (!presentation) {
    return {
      label: "Inconnu",
      icon: "help-circle-outline",
      backgroundColor: theme.borderSecondary,
      color: theme.textInactive,
    };
  }

  return {
    label: presentation.label,
    icon: presentation.icon,
    ...getToneColors(theme, presentation.tone),
  };
}

/**
 * Formats API date values consistently across live-link moderation screens.
 */
export function formatModerationDateTime(
  value?: string | number | null,
): string {
  if (!value) {
    return "-";
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

/**
 * Filters moderation matches by team labels and orders them newest first
 * without mutating the query result.
 */
export function filterAndSortModerationMatches<
  T extends {
    matchDate?: string | null;
    teamA: { name?: string | null; shortName?: string | null };
    teamB: { name?: string | null; shortName?: string | null };
  },
>(matches: readonly T[], search: string): T[] {
  const normalizedSearch = search.trim().toLowerCase();

  return matches
    .filter((match) => {
      if (!normalizedSearch) {
        return true;
      }

      const teamALabel = match.teamA.shortName ?? match.teamA.name ?? "";
      const teamBLabel = match.teamB.shortName ?? match.teamB.name ?? "";
      return `${teamALabel} vs ${teamBLabel}`
        .toLowerCase()
        .includes(normalizedSearch);
    })
    .slice()
    .sort((left, right) => {
      if (!left.matchDate || !right.matchDate) {
        return 0;
      }

      const leftDate = new Date(left.matchDate).getTime();
      const rightDate = new Date(right.matchDate).getTime();
      return rightDate - leftDate;
    });
}

/**
 * Orders live-link history entries newest first without mutating the source.
 */
export function sortLiveLinkHistory<
  T extends Pick<MatchLiveLinkHistoryResponse, "createdAt">,
>(links: readonly T[]): T[] {
  return links.slice().sort((left, right) => {
    const leftDate = new Date(left.createdAt ?? 0).getTime();
    const rightDate = new Date(right.createdAt ?? 0).getTime();
    return rightDate - leftDate;
  });
}

/**
 * Returns the icon associated with a supported live-stream provider.
 */
export function getLiveProviderIcon(
  provider: LiveProviderEnum | null | undefined,
): ComponentProps<typeof MaterialCommunityIcons>["name"] {
  switch (provider) {
    case "YOUTUBE":
      return "youtube";
    case "TWITCH":
      return "twitch";
    case "FACEBOOK":
      return "facebook";
    default:
      return "video-outline";
  }
}

/**
 * Derives the moderation actions available for a live-link status.
 */
export function getLiveLinkModerationActions(status: LiveLinkStatusEnum): {
  approve: boolean;
  reject: boolean;
  deleteActive: boolean;
  reactivate: boolean;
} {
  return {
    approve: status === "PENDING",
    reject: status === "PENDING",
    deleteActive: status === "ACTIVE",
    reactivate:
      status === "REJECTED" ||
      status === "EXPIRED" ||
      status === "BANNED" ||
      status === "DEACTIVATED",
  };
}
