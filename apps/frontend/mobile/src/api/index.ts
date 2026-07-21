import {TokenSupplier} from "@/src/shared/api/HttpClient";
import {ApiError} from "@/src/shared/api/ApiError";
import {MobileGatewayApi} from "@/src/api/MobileGatewayApi";

export type ApiClients = {
  mobile: MobileGatewayApi;
};

export function createApis(): ApiClients {
  return {
    mobile: new MobileGatewayApi(),
  };
}

export function setAuthOnApis(
  apis: ApiClients,
  tokenSupplier?: TokenSupplier,
  onUnauthorized?: (e: ApiError) => void | Promise<void>
) {
  Object.values(apis).forEach((svc) => svc.setAuthContext(tokenSupplier, onUnauthorized));
}
