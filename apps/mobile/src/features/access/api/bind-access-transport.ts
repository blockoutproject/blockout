import type { QueryClient } from "@tanstack/react-query";
import { Platform } from "react-native";
import { getGetMyAccountQueryKey } from "../../../../.generated/mobile";
import {
  GetMaintenanceSettings200,
  ChangeMaintenanceSettings200,
  SetMaintenanceActivation200,
  GetApplicationVersionSettings200,
  ChangeApplicationVersionSettings200,
  type AccountResponse,
  type MaintenanceSettingsResponse,
  type ApplicationVersionsResponse,
} from "../../../../.generated/schemas/index.zod";
import {
  bindApiAdmission,
  type ApiFetchOptions,
} from "../../../shared/api/api-fetch";
import { getSessionQueryKey } from "../../../shared/query/query-client";
import type { SessionGeneration } from "../../accounts/session/session-generation";
import type { AccessObservations } from "../state/access-observations";
import type { createMaintenanceBypass } from "../state/maintenance-bypass";
import { installedVersionStatus } from "../native/installed-version";
import { readMaintenanceProblem } from "./maintenance-problem";

/** Real process/session/cache owners; Auth0 alone supplies renewable credentials. */
export interface AccessTransportDependencies {
  client: QueryClient;
  session: Pick<SessionGeneration, "getSnapshot" | "subscribe" | "isCurrent">;
  observations: AccessObservations;
  bypass: ReturnType<typeof createMaintenanceBypass>;
  getCredentials(): Promise<{ accessToken: string } | null | undefined>;
}

/** Mirrors only the documented exact identification/configuration/operational exceptions. */
function ordinary(path: string, method = "GET") {
  return (
    !(path === "/application-access" && method === "GET") &&
    !(path === "/accounts/me" && method === "GET") &&
    !(
      path === "/administration/maintenance" &&
      ["GET", "PATCH"].includes(method)
    ) &&
    !(path === "/administration/maintenance/activation" && method === "PUT") &&
    !(
      path === "/administration/application-versions" &&
      ["GET", "PATCH"].includes(method)
    )
  );
}

/** Binds observations and personal intent once to the common backend transport, including binary photos. */
export function bindAccessTransport({
  client,
  session,
  observations,
  bypass,
  getCredentials,
}: AccessTransportDependencies) {
  /** Reads the sole current-account cache; failed refreshes never lend retained permissions. */
  function currentAccount() {
    const current = session.getSnapshot();
    const query = client.getQueryState<AccountResponse>(
      getSessionQueryKey(current.generation, getGetMyAccountQueryKey()),
    );
    return query?.status === "success" &&
      query.data?.accountId === current.accountId
      ? query.data
      : undefined;
  }
  /** Drops intent at observed account/grant loss; no rights are copied into another store. */
  function reconcileAccount() {
    const owner = bypass.getSnapshot();
    const current = session.getSnapshot();
    if (
      owner &&
      (!bypass.active(current) ||
        (currentAccount() !== undefined &&
          currentAccount()?.permissions.bypassMaintenance !== true))
    )
      bypass.clear();
  }
  const stopSession = session.subscribe(reconcileAccount);
  const stopAccount = client.getQueryCache().subscribe(reconcileAccount);
  const stopObservations = observations.subscribe(() => {
    if (observations.getSnapshot().complete?.maintenance.active === false)
      bypass.clear();
  });
  const stopTransport = bindApiAdmission({
    async prepare(path, options) {
      const headers = new Headers(options.headers);
      // Only this owner may supply intent; a stale caller header cannot survive clearing.
      headers.delete("Blockout-Maintenance-Bypass");
      const current = session.getSnapshot();
      const versions = observations.getSnapshot().versions;
      const platform =
        Platform.OS === "ios" ? versions?.ios : versions?.android;
      const eligible =
        bypass.active(current) &&
        currentAccount()?.permissions.bypassMaintenance === true &&
        platform !== undefined &&
        installedVersionStatus(platform.minimumVersion) === "satisfied";
      if (!ordinary(path, options.method) || !eligible)
        return { ...options, headers };
      const captured: ApiFetchOptions["session"] = options.session ?? {
        generation: current.generation,
        isCurrent: session.isCurrent,
      };
      if (!headers.has("Authorization")) {
        const credentials = await getCredentials();
        if (!credentials) return { ...options, session: captured, headers };
        headers.set("Authorization", `Bearer ${credentials.accessToken}`);
      }
      headers.set("Blockout-Maintenance-Bypass", "true");
      return { ...options, session: captured, headers };
    },
    accept(path, data, schema) {
      // Identity of the generated operation schema proves this already validated shape; do not parse twice.
      if (
        path === "/administration/maintenance" ||
        path === "/administration/maintenance/activation"
      ) {
        if (
          schema === GetMaintenanceSettings200 ||
          schema === ChangeMaintenanceSettings200 ||
          schema === SetMaintenanceActivation200
        ) {
          const value = data as MaintenanceSettingsResponse;
          observations.maintenance({
            ...value,
            message: value.active ? value.message : null,
            imageUrl: value.active ? value.imageUrl : null,
          });
        }
      } else if (
        path === "/administration/application-versions" &&
        (schema === GetApplicationVersionSettings200 ||
          schema === ChangeApplicationVersionSettings200)
      ) {
        observations.versions(data as ApplicationVersionsResponse);
      }
    },
    refuse(path, error, options) {
      if (!ordinary(path, options.method)) return;
      const maintenance = readMaintenanceProblem(error);
      if (maintenance) observations.maintenance(maintenance);
      else if (error.status === 503) observations.fail();
      if (
        new Headers(options.headers).has("Blockout-Maintenance-Bypass") &&
        (maintenance || error.status === 401 || error.status === 403)
      )
        bypass.clear();
    },
  });
  return () => {
    stopTransport();
    stopSession();
    stopAccount();
    stopObservations();
  };
}
