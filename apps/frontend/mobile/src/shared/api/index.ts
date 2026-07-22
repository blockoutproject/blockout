import {ApiError} from "@/src/shared/api/ApiError";
import {MobileGatewayApi} from "@/src/shared/api/MobileGatewayApi";
import type {TokenSupplier} from "@/src/shared/api/orvalFetch";

export type ApiClients = {
  mobile: MobileGatewayApi;
};

/** Create the stable application API registry. */
export function createApis(): ApiClients {
  return {
    mobile: new MobileGatewayApi(),
  };
}

/** Configure authentication for every API exposed by the registry. */
export function setAuthOnApis(
  apis: ApiClients,
  tokenSupplier?: TokenSupplier,
  onUnauthorized?: (e: ApiError) => void | Promise<void>
) {
  Object.values(apis).forEach((svc) => svc.setAuthContext(tokenSupplier, onUnauthorized));
}
