import {
  useMutation,
  useQuery,
  useQueryClient,
  skipToken,
  type QueryKey,
} from "@tanstack/react-query";
import {
  createDivision,
  getGetDivisionQueryKey,
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
    };

/** A confirmed write always returns one resource. */
type SavedPresentation = Exclude<
  Presentation,
  {
    kind: "division-creation";
  }
>;
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
  let options;
  if (target.kind === "club") {
    options = queries.clubPresentation(target.id);
  } else if (target.kind === "team") {
    options = queries.teamPresentation(target.id);
  } else if (target.kind === "pool") {
    options = queries.poolPresentation(target.id);
  } else if (target.kind === "division") {
    options = queries.division(target.id);
  }
  const queryKey = options?.queryKey ?? getCreateDivisionMutationKey();
  const query = useQuery<
    PresentationData | null,
    Error,
    Presentation | null,
    QueryKey
  >({
    queryKey,
    queryFn: options?.queryFn ?? skipToken,
    gcTime: 0,
    enabled:
      target.kind !== "division-creation" &&
      enabled &&
      authority.enabled &&
      session.status === "authenticated",
    select: (data) => toPresentation(target, data),
  });

  /** Invalidates the edited resource and affected projections after settlement. */
  function accept() {
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
  } else if (target.kind === "division") {
    operationKey = getSetDivisionPresentationMutationKey();
  } else {
    operationKey = getCreateDivisionMutationKey();
  }
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
    onSuccess: (accepted, { revision }) => {
      // A late save cannot restore refused data or replace a newer observed revision.
      const acceptedKey =
        target.kind === "division-creation"
          ? getGetDivisionQueryKey(accepted.data.id)
          : queryKey;
      client.setQueryData<PresentationData | null>(acceptedKey, (current) =>
        current === null || (current && current.revision !== revision)
          ? undefined
          : accepted.data,
      );
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
