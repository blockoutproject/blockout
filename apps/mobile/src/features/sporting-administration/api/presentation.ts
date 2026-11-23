import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import {
  getSetClubPresentationMutationKey,
  getSetDivisionPresentationMutationKey,
  getSetPoolPresentationMutationKey,
  getSetTeamPresentationMutationKey,
  setClubPresentation,
  setDivisionPresentation,
  setPoolPresentation,
  setTeamPresentation,
} from "../../../../.generated/mobile";
import type {
  DivisionResponse,
  PoolPresentationResponse,
  SportingPresentationResponse,
} from "../../../../.generated/schemas/index.zod";
import type { PresentationValues } from "../schemas/presentation-schema";
import { useSportingAuthority } from "./classification";
import {
  invalidateDivisionReads,
  invalidateMappingReads,
  invalidateSportingReads,
} from "./invalidate-sporting-reads";
import {
  toClubPresentationBody,
  toDivisionBody,
  toPoolPresentationBody,
  toTeamPresentationBody,
} from "./presentation-request";
import { createSportingAdministrationQueries } from "./sporting-administration-queries";

/** Stable original target; no identity, classification or activity can be changed by this editor. */
export interface PresentationTarget {
  kind: "club" | "team" | "pool" | "division";
  id: string;
}

/** Validated generated projections retain their resource-specific meaning at the form boundary. */
export type Presentation =
  | { kind: "club" | "team"; data: SportingPresentationResponse }
  | { kind: "pool"; data: PoolPresentationResponse }
  | { kind: "division"; data: DivisionResponse };

/** Raw generated response families remain canonical regardless of the editor observing them. */
type PresentationData =
  SportingPresentationResponse | PoolPresentationResponse | DivisionResponse;

/** Adds the editor's discriminant after cache observation; generated schemas already validated each DTO. */
function toPresentation(
  target: PresentationTarget,
  data: PresentationData | null,
): Presentation | null {
  if (data === null) {
    return null;
  }
  if ("name" in data) {
    return { kind: "division", data };
  }
  if ("logo" in data) {
    return { kind: target.kind === "club" ? "club" : "team", data };
  }
  return { kind: "pool", data };
}

/** Original-target reads, single atomic writes and current-session cache admission; never replays a mutation. */
export function usePresentation(target: PresentationTarget, enabled: boolean) {
  const authority = useSportingAuthority(
    target.kind === "division" ? "divisions" : "presentation",
  );
  const { session } = authority;
  const client = useQueryClient();
  const canRead =
    enabled && authority.enabled && session.status === "authenticated";
  const queries = createSportingAdministrationQueries({
    ...authority,
    enabled: canRead,
  });
  let options;
  if (target.kind === "club") {
    options = queries.clubPresentation(target.id);
  } else if (target.kind === "team") {
    options = queries.teamPresentation(target.id);
  } else if (target.kind === "pool") {
    options = queries.poolPresentation(target.id);
  } else {
    options = queries.division(target.id);
  }
  const { queryKey } = options;
  const query = useQuery<
    PresentationData | null,
    Error,
    Presentation | null,
    QueryKey
  >({
    queryKey,
    queryFn: options.queryFn,
    gcTime: 0,
    enabled: canRead,
    select: (data) => toPresentation(target, data),
  });

  /** Invalidates the edited resource and affected projections after settlement. */
  function invalidateReads() {
    void client.invalidateQueries({ queryKey, exact: true });
    invalidateSportingReads(client);
    invalidateDivisionReads(client);
  }

  let operationKey;
  if (target.kind === "club") {
    operationKey = getSetClubPresentationMutationKey();
  } else if (target.kind === "team") {
    operationKey = getSetTeamPresentationMutationKey();
  } else if (target.kind === "pool") {
    operationKey = getSetPoolPresentationMutationKey();
  } else {
    operationKey = getSetDivisionPresentationMutationKey();
  }
  const save = useMutation({
    mutationKey: [...queryKey, ...operationKey],
    mutationFn: async (values: PresentationValues): Promise<Presentation> => {
      const options = await authority.request();
      let accepted: Presentation;
      switch (target.kind) {
        case "club":
          accepted = {
            kind: "club",
            data: await setClubPresentation(
              target.id,
              toClubPresentationBody(values),
              options,
            ),
          };
          break;
        case "team":
          accepted = {
            kind: "team",
            data: await setTeamPresentation(
              target.id,
              toTeamPresentationBody(values),
              options,
            ),
          };
          break;
        case "pool":
          accepted = {
            kind: "pool",
            data: await setPoolPresentation(
              target.id,
              toPoolPresentationBody(values),
              options,
            ),
          };
          break;
        case "division":
          accepted = {
            kind: "division",
            data: await setDivisionPresentation(
              target.id,
              toDivisionBody(values),
              options,
            ),
          };
          break;
      }
      return accepted;
    },
    onSuccess: (accepted) => {
      // An acknowledged save cannot restore data withdrawn by a current refusal.
      client.setQueryData<PresentationData | null>(queryKey, (current) =>
        current === null ? undefined : accepted.data,
      );
      if (target.kind === "division") {
        invalidateMappingReads(client);
      }
    },
    onSettled: invalidateReads,
  });
  return { query, save };
}
