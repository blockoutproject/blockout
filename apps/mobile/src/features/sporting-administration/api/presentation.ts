import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import {
  createDivision,
  getCreateDivisionMutationKey,
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
  DivisionListResponse,
  DivisionResponse,
  PoolPresentationResponse,
  SportingPresentationResponse,
} from "../../../../.generated/schemas/index.zod";
import type { PresentationValues } from "../schemas/presentation-schema";
import { useSportingAuthority } from "./classification";
import {
  invalidateDivisionReads,
  invalidateSportingReads,
} from "./invalidate-sporting-reads";
import { createPresentationLogoQueryOptions } from "./presentation-logo-query";
import {
  toClubPresentationBody,
  toCreateDivisionBody,
  toDivisionPresentationBody,
  toPoolPresentationBody,
  toTeamPresentationBody,
} from "./presentation-request";
import { createSportingAdministrationQueries } from "./sporting-administration-queries";

/** Stable original target; no identity, classification or activity can be changed by this editor. */
export type PresentationTarget =
  | {
      kind: "club" | "team" | "pool" | "division";
      id: string;
    }
  | {
      kind: "division-creation";
      id?: never;
    };
/** Validated generated projections retain their resource-specific meaning at the form boundary. */
export type Presentation =
  | {
      kind: "club" | "team";
      data: SportingPresentationResponse;
    }
  | {
      kind: "pool";
      data: PoolPresentationResponse;
    }
  | {
      kind: "division";
      data: DivisionResponse;
    }
  | {
      kind: "division-creation";
      data: DivisionListResponse;
    };
/** A confirmed write always returns one resource, never the division-creation list read. */
type SavedPresentation = Exclude<
  Presentation,
  {
    kind: "division-creation";
  }
>;
/** Raw generated response families remain canonical regardless of the editor observing them. */
type PresentationData =
  | SportingPresentationResponse
  | PoolPresentationResponse
  | DivisionResponse
  | DivisionListResponse;
/** Adds the editor's discriminant after cache observation; generated schemas already validated each DTO. */
function toPresentation(
  target: PresentationTarget,
  data: PresentationData,
): Presentation {
  if ("items" in data) return { kind: "division-creation", data };
  if ("name" in data) return { kind: "division", data };
  if ("logo" in data)
    return { kind: target.kind === "club" ? "club" : "team", data };
  return { kind: "pool", data };
}
/** Original-target reads, single atomic writes and current-session cache admission; never replays a mutation. */
export function usePresentation(target: PresentationTarget, enabled: boolean) {
  const authority = useSportingAuthority(
    target.kind === "division-creation" || target.kind === "division"
      ? "divisions"
      : "presentation",
  );
  const { session } = authority;
  const client = useQueryClient();
  const queries = createSportingAdministrationQueries({
    ...authority,
    enabled: enabled && authority.enabled && session.status === "authenticated",
  });
  const options =
    target.kind === "club"
      ? queries.clubPresentation(target.id)
      : target.kind === "team"
        ? queries.teamPresentation(target.id)
        : target.kind === "pool"
          ? queries.poolPresentation(target.id)
          : target.kind === "division"
            ? queries.division(target.id)
            : queries.divisions();
  const queryKey = options.queryKey;
  const query = useQuery<PresentationData, Error, Presentation, QueryKey>({
    queryKey: options.queryKey,
    queryFn: options.queryFn,
    gcTime: options.gcTime,
    enabled: enabled && authority.enabled && session.status === "authenticated",
    select: (data) => toPresentation(target, data),
  });
  /** Invalidates the edited resource and affected projections after settlement. */
  function accept() {
    void client.invalidateQueries({ queryKey, exact: true });
    invalidateSportingReads(client);
    invalidateDivisionReads(client);
  }
  const operationKey =
    target.kind === "club"
      ? getSetClubPresentationMutationKey()
      : target.kind === "team"
        ? getSetTeamPresentationMutationKey()
        : target.kind === "pool"
          ? getSetPoolPresentationMutationKey()
          : target.kind === "division"
            ? getSetDivisionPresentationMutationKey()
            : getCreateDivisionMutationKey();
  const save = useMutation({
    retry: false,
    networkMode: "always",
    mutationKey: [...queryKey, ...operationKey],
    mutationFn: async ({
      revision,
      values,
    }: {
      revision: string;
      values: PresentationValues;
    }): Promise<SavedPresentation> => {
      const options = await authority.request();
      let accepted: SavedPresentation;
      switch (target.kind) {
        case "division-creation":
          accepted = {
            kind: "division",
            data: await createDivision(toCreateDivisionBody(values), options),
          };
          break;
        case "club":
          accepted = {
            kind: "club",
            data: await setClubPresentation(
              target.id,
              toClubPresentationBody(revision, values),
              options,
            ),
          };
          break;
        case "team":
          accepted = {
            kind: "team",
            data: await setTeamPresentation(
              target.id,
              toTeamPresentationBody(revision, values),
              options,
            ),
          };
          break;
        case "pool":
          accepted = {
            kind: "pool",
            data: await setPoolPresentation(
              target.id,
              toPoolPresentationBody(revision, values),
              options,
            ),
          };
          break;
        case "division":
          accepted = {
            kind: "division",
            data: await setDivisionPresentation(
              target.id,
              toDivisionPresentationBody(revision, values),
              options,
            ),
          };
          break;
      }
      return accepted;
    },
    onSettled: accept,
  });
  return { query, save, queryKey };
}
/** Loads backend-controlled binary artwork using #203's generated operations, without direct URL image requests. */
export function usePresentationLogo(
  target: PresentationTarget,
  selection: "effective" | "automatic",
  enabled: boolean,
  revision: string,
) {
  const authority = useSportingAuthority(
    target.kind === "division" ? "divisions" : "presentation",
  );
  return useQuery(
    createPresentationLogoQueryOptions(
      {
        ...authority,
        enabled:
          enabled &&
          authority.enabled &&
          authority.session.status === "authenticated",
      },
      target,
      selection,
      revision,
    ),
  );
}
