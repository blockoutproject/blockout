import { publishSportingRevision } from "./publish-sporting-revision";
import { requiresPresentationReread } from "./presentation-recovery";
import { useCommand } from "../../../shared/query/use-command";
import { createPresentationLogoQueryOptions } from "./presentation-logo-query";
import {
  toCreateDivisionBody,
  toClubPresentationBody,
  toTeamPresentationBody,
  toPoolPresentationBody,
  toDivisionPresentationBody,
} from "./presentation-request";
import {
  hashKey,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { useSportingAuthority } from "./classification";
import { createSportingAdministrationQueries } from "./sporting-administration-queries";
import {
  invalidateSportingReads,
  invalidateDivisionReads,
} from "./invalidate-sporting-reads";
import {
  createDivision,
  getCreateDivisionMutationKey,
  getSetClubPresentationMutationKey,
  getSetTeamPresentationMutationKey,
  getSetPoolPresentationMutationKey,
  getSetDivisionPresentationMutationKey,
  setClubPresentation,
  setTeamPresentation,
  setPoolPresentation,
  setDivisionPresentation,
  getGetClubLogoQueryKey,
  getGetTeamLogoQueryKey,
  getGetDivisionLogoQueryKey,
  getGetClubQueryKey,
  getGetTeamQueryKey,
  getGetPoolQueryKey,
} from "../../../../.generated/mobile";
import type {
  SportingPresentationResponse,
  PoolPresentationResponse,
  DivisionResponse,
  DivisionListResponse,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import type { PresentationValues } from "../schemas/presentation-schema";

/** Stable original target; no identity, classification or activity can be changed by this editor. */
export type PresentationTarget =
  | { kind: "club" | "team" | "pool" | "division"; id: string }
  | { kind: "division-creation"; id?: never };

/** Validated generated projections retain their resource-specific meaning at the form boundary. */
export type Presentation =
  | { kind: "club" | "team"; data: SportingPresentationResponse }
  | { kind: "pool"; data: PoolPresentationResponse }
  | { kind: "division"; data: DivisionResponse }
  | { kind: "division-creation"; data: DivisionListResponse };

/** A confirmed write always returns one resource, never the division-creation list read. */
type SavedPresentation = Exclude<Presentation, { kind: "division-creation" }>;

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
  /** Reads use canonical grants; commands also recheck their readable baseline before and after credentials. */
  async function request(
    signal?: AbortSignal,
    writing = false,
    readKey?: QueryKey,
  ) {
    if (writing && !enabled) throw new ApiError("http", 403);
    return authority.request(
      signal,
      writing
        ? target.kind === "division-creation"
          ? "lifecycle"
          : "presentation"
        : undefined,
      readKey,
    );
  }
  const queries = createSportingAdministrationQueries({
    ...authority,
    enabled: enabled && authority.enabled && session.status === "authenticated",
    request,
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
  const query = useQuery<
    PresentationData,
    Error,
    Presentation,
    ReturnType<typeof getSessionQueryKey>
  >({
    queryKey: options.queryKey,
    queryFn: options.queryFn,
    gcTime: options.gcTime,
    enabled: enabled && authority.enabled && session.status === "authenticated",
    select: (data) => toPresentation(target, data),
  });
  /** Owns cache publication/invalidation after transport acceptance, without converting a retired session into a refusal. */
  async function accept(
    accepted: SavedPresentation,
    { revision }: { revision: string },
  ) {
    await client.cancelQueries({ queryKey, exact: true });
    if (!session.isCurrent(session.generation)) return;
    if (target.kind !== "division-creation")
      publishSportingRevision(client, queryKey, accepted.data, revision);
    if (target.kind === "division" || target.kind === "division-creation") {
      invalidateSportingReads(client);
      invalidateDivisionReads(
        client,
        target.kind === "division" ? queryKey : undefined,
      );
    }
    // Existing public readers share their generated resource URLs; invalidate every current admission context.
    const affected: readonly unknown[] =
      target.kind === "club"
        ? [
            ...getGetClubLogoQueryKey(target.id),
            ...getGetClubQueryKey(target.id),
          ]
        : target.kind === "team"
          ? [
              ...getGetTeamLogoQueryKey(target.id),
              ...getGetTeamQueryKey(target.id),
            ]
          : target.kind === "pool"
            ? getGetPoolQueryKey(target.id)
            : target.kind === "division"
              ? getGetDivisionLogoQueryKey(target.id)
              : [];
    void client.invalidateQueries({
      predicate: ({ queryKey: key }) =>
        key.some(
          (part) => typeof part === "string" && affected.includes(part),
        ) && hashKey(key) !== hashKey(queryKey),
    });
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
  const save = useCommand(
    {
      mutationKey: [...queryKey, ...operationKey],
      mutationFn: async ({
        revision,
        values,
      }: {
        revision: string;
        values: PresentationValues;
      }): Promise<SavedPresentation> => {
        const options = await request(undefined, true, queryKey);
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
      onSuccess: accept,
    },
    { groupKey: queryKey, requiresRead: requiresPresentationReread },
  );
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
