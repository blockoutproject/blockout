import { z } from "zod";
import {
  SupportTargetTypeEnum,
  type SupportContextRequest,
} from "../../../../.generated/schemas/index.zod";

/** Untrusted navigation inputs; only finite known facts are admitted to context or the support URL. */
export interface SupportOrigin {
  screen?: unknown;
  targetType?: unknown;
  targetId?: unknown;
  failureStage?: unknown;
  failureReason?: unknown;
}
const screens = {
  profile: "Profil",
  "sign-in": "Connexion",
  club: "Club",
  team: "Équipe",
  pool: "Poule",
  match: "Match",
  pro: "Pro",
};

/** Narrows only this journey's public route facts, never raw URLs, provider errors or declared identity. */
function originParams(origin: SupportOrigin) {
  const params: Record<string, string> = {};
  if (
    typeof origin.screen === "string" &&
    Object.hasOwn(screens, origin.screen)
  )
    params.screen = origin.screen;
  const type = SupportTargetTypeEnum.safeParse(origin.targetType);
  const id = z.string().uuid().safeParse(origin.targetId);
  if (type.success && id.success) {
    params.targetType = type.data;
    params.targetId = id.data;
  }
  if (
    params.screen === "sign-in" &&
    (origin.failureStage === "authentication" ||
      origin.failureStage === "account-establishment")
  ) {
    params.failureStage = origin.failureStage;
    if (
      origin.failureReason === "cancelled" ||
      origin.failureReason === "unavailable"
    )
      params.failureReason = origin.failureReason;
  }
  return params;
}

/** Keeps the attempted target even when its detail failed, without looking up hidden facts or inventing a name. */
export function supportContext(origin: SupportOrigin): SupportContextRequest {
  const params = originParams(origin);
  const context: SupportContextRequest = {};
  if (params.screen)
    context.screen = screens[params.screen as keyof typeof screens];
  if (params.targetType && params.targetId) {
    context.action = "Consultation de la cible";
    context.target = {
      type: SupportTargetTypeEnum.parse(params.targetType),
      id: params.targetId,
    };
  }
  if (params.failureStage) {
    context.action = "Connexion";
    context.signInFailure = {
      method: "hosted",
      stage: params.failureStage,
      ...(params.failureReason ? { reason: params.failureReason } : {}),
    };
  }
  return context;
}

/** Routes every existing consumer to one form using only bounded, public navigation facts. */
export function supportHref(origin: SupportOrigin) {
  // Expo Router reserves `screen` for nested navigation, so the URL uses an owner-specific name.
  const { screen, ...params } = originParams(origin);
  return {
    pathname: "/support" as const,
    params: { ...params, ...(screen ? { originScreen: screen } : {}) },
  };
}
