import { ApiError } from '@/src/api/core/ApiError';
import { MobileGatewayApi } from '@/src/api/MobileGatewayApi';
import {
  setOrvalAuthContext,
  type TokenSupplier,
} from '@/src/api/core/orvalAxios';

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
  onUnauthorized?: (e: ApiError) => void | Promise<void>,
) {
  Object.values(apis).forEach((svc) =>
    svc.setAuthContext(tokenSupplier, onUnauthorized),
  );
  setOrvalAuthContext(tokenSupplier, onUnauthorized);
}
