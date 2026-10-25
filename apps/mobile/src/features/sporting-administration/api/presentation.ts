import {
  hashKey,
  useIsMutating,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { invalidateSportingReads } from "./invalidate-sporting-reads";
import { useAuth0 } from "react-native-auth0";
import {
  getClubPresentation,
  getTeamPresentation,
  getPoolPresentation,
  getDivision,
  listDivisions,
  createDivision,
  getListDivisionsQueryKey,
  setClubPresentation,
  setTeamPresentation,
  setPoolPresentation,
  setDivisionPresentation,
  getGetClubPresentationQueryKey,
  getGetTeamPresentationQueryKey,
  getGetPoolPresentationQueryKey,
  getGetDivisionQueryKey,
  getGetClubLogoQueryKey,
  getGetTeamLogoQueryKey,
  getGetDivisionLogoQueryKey,
  getGetMyAccountQueryKey,
  getGetClubQueryKey,
  getGetTeamQueryKey,
  getGetPoolQueryKey,
  getClubLogo,
  getTeamLogo,
  getDivisionLogo,
} from "../../../../.generated/mobile";
import type {
  AccountResponse,
  SportingPresentationResponse,
  PoolPresentationResponse,
  DivisionResponse,
  DivisionListResponse,
} from "../../../../.generated/schemas/index.zod";
import { ApiError } from "../../../shared/api/api-fetch";
import { binaryImagePreview } from "../../../shared/api/binary-image-preview";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import { useAccountSession } from "../../accounts/current-account";
import { useOperationalVersionAdmission } from "../../access/operational-version-admission";
import type { PresentationValues } from "../forms/presentation-values";

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

/** Original-target reads, single atomic writes and current-session cache admission; never replays a mutation. */
export function usePresentation(target: PresentationTarget, enabled: boolean) {
  const session = useAccountSession();
  const auth = useAuth0();
  const client = useQueryClient();
  const version = useOperationalVersionAdmission();
  const generatedKey =
    target.kind === "club"
      ? getGetClubPresentationQueryKey(target.id)
      : target.kind === "team"
        ? getGetTeamPresentationQueryKey(target.id)
        : target.kind === "pool"
          ? getGetPoolPresentationQueryKey(target.id)
          : target.kind === "division"
            ? getGetDivisionQueryKey(target.id)
            : [
                ...getListDivisionsQueryKey({ includeInactive: true }),
                "creation",
              ];
  const queryKey = getSessionQueryKey(session.generation, generatedKey);
  const saving = useIsMutating({ mutationKey: queryKey }) > 0;

  /** Rechecks current F05/F12 authority after credentials; the server still owns resource authorization. */
  async function request(signal?: AbortSignal) {
    const credentials = await auth.getCredentials();
    if (!session.isCurrent(session.generation)) throw new ApiError("cancelled");
    version.assertCurrent();
    const account = client.getQueryState<AccountResponse>(
      getSessionQueryKey(session.generation, getGetMyAccountQueryKey()),
    );
    if (
      !enabled ||
      account?.status !== "success" ||
      account.data?.accountId !== session.accountId ||
      (target.kind === "division-creation"
        ? account.data.permissions.manageDivisionLifecycle !== true
        : account.data.permissions.manageSportingPresentation !== true)
    )
      throw new ApiError("http", 403);
    if (!credentials) throw new ApiError("http", 401);
    return {
      session,
      signal,
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    };
  }
  const query = useQuery({
    queryKey,
    gcTime: 0,
    enabled: enabled && version.satisfied && session.status === "authenticated",
    queryFn: async ({ signal }): Promise<Presentation> => {
      const options = await request(signal);
      switch (target.kind) {
        case "club":
          return {
            kind: "club",
            data: await getClubPresentation(target.id, options),
          };
        case "team":
          return {
            kind: "team",
            data: await getTeamPresentation(target.id, options),
          };
        case "pool":
          return {
            kind: "pool",
            data: await getPoolPresentation(target.id, options),
          };
        case "division-creation":
          return {
            kind: "division-creation",
            data: await listDivisions({ includeInactive: true }, options),
          };
        case "division":
          return {
            kind: "division",
            data: await getDivision(target.id, options),
          };
      }
    },
  });
  const save = useMutation({
    mutationKey: queryKey,
    gcTime: 0,
    mutationFn: async ({
      revision,
      values,
    }: {
      revision: string;
      values: PresentationValues;
    }): Promise<Presentation> => {
      const options = await request();
      const image =
        values.logo.action === "replace" ? { image: values.logo.prepared } : {};
      const common = { revision, logoAction: values.logo.action };
      const manualName = values.name === "" ? null : values.name.trim();
      const manualShortName =
        values.shortName === "" ? null : values.shortName.trim();
      let accepted: Presentation;
      switch (target.kind) {
        case "division-creation":
          accepted = {
            kind: "division",
            data: await createDivision(
              {
                metadata: {
                  name: values.name.trim(),
                  color: values.color,
                  gradient: values.gradient.every((v) => v === "")
                    ? null
                    : values.gradient,
                  logoAction: values.logo.action,
                },
                ...image,
              },
              options,
            ),
          };
          break;
        case "club":
          accepted = {
            kind: "club",
            data: await setClubPresentation(
              target.id,
              { metadata: { ...common, manualName }, ...image },
              options,
            ),
          };
          break;
        case "team":
          accepted = {
            kind: "team",
            data: await setTeamPresentation(
              target.id,
              {
                metadata: { ...common, manualName, manualShortName },
                ...image,
              },
              options,
            ),
          };
          break;
        case "pool":
          accepted = {
            kind: "pool",
            data: await setPoolPresentation(
              target.id,
              { revision, manualName, manualShortName },
              options,
            ),
          };
          break;
        case "division":
          accepted = {
            kind: "division",
            data: await setDivisionPresentation(
              target.id,
              {
                metadata: {
                  ...common,
                  name: values.name.trim(),
                  color: values.color,
                  gradient: values.gradient.every((v) => v === "")
                    ? null
                    : values.gradient,
                },
                ...image,
              },
              options,
            ),
          };
          break;
      }
      await client.cancelQueries({ queryKey, exact: true });
      if (!session.isCurrent(session.generation))
        throw new ApiError("cancelled");
      if (target.kind !== "division-creation")
        client.setQueryData(queryKey, accepted);
      if (target.kind === "division" || target.kind === "division-creation") {
        invalidateSportingReads(client);
        void client.invalidateQueries({
          predicate: ({ queryKey: key }) =>
            hashKey(key) !== hashKey(queryKey) &&
            key.some(
              (part) =>
                typeof part === "string" &&
                part.startsWith("/administration/divisions"),
            ),
        });
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
      return accepted;
    },
  });
  return { query, save, saving };
}

/** Loads backend-controlled binary artwork using #203's generated operations, without direct URL image requests. */
export function usePresentationLogo(
  target: PresentationTarget,
  selection: "effective" | "automatic",
  enabled: boolean,
  revision: string,
) {
  const session = useAccountSession();
  const auth = useAuth0();
  const version = useOperationalVersionAdmission();
  const generatedKey =
    target.kind === "team"
      ? getGetTeamLogoQueryKey(target.id, { selection })
      : target.kind === "club"
        ? getGetClubLogoQueryKey(target.id)
        : target.kind === "division"
          ? getGetDivisionLogoQueryKey(target.id)
          : [];
  return useQuery({
    queryKey: getSessionQueryKey(session.generation, [
      ...generatedKey,
      revision,
    ]),
    enabled:
      enabled &&
      target.kind !== "pool" &&
      target.kind !== "division-creation" &&
      version.satisfied &&
      session.status === "authenticated",
    gcTime: 0,
    queryFn: async ({ signal }) => {
      const credentials = await auth.getCredentials();
      if (!session.isCurrent(session.generation))
        throw new ApiError("cancelled");
      version.assertCurrent();
      if (!credentials) throw new ApiError("http", 401);
      const options = {
        signal,
        session,
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      };
      const blob =
        target.kind === "team"
          ? await getTeamLogo(target.id, { selection }, options)
          : target.kind === "club"
            ? await getClubLogo(target.id, options)
            : target.kind === "division"
              ? await getDivisionLogo(target.id, options)
              : undefined;
      if (!blob) throw new ApiError("configuration");
      const uri = await binaryImagePreview(blob);
      if (!session.isCurrent(session.generation) || signal.aborted)
        throw new ApiError("cancelled");
      return uri;
    },
  });
}
