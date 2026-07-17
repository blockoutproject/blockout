import axios, { AxiosError, AxiosHeaders, AxiosRequestConfig } from 'axios';
import qs from 'qs';
import { CONFIG } from '@/src/config/config';
import { ApiError } from './ApiError';
import type { TokenSupplier } from './HttpClient';

type UnauthorizedHandler = (error: ApiError) => void | Promise<void>;

export type OrvalRequestPromise<T> = Promise<T> & {
  cancel: () => void;
};

let tokenSupplier: TokenSupplier | undefined;
let onUnauthorized: UnauthorizedHandler | undefined;

const mobileGatewayV2 = axios.create({
  baseURL: CONFIG.API_GATEWAY_BASE_URL,
  timeout: 20_000,
  paramsSerializer: (params) => qs.stringify(params, { arrayFormat: 'repeat' }),
});

mobileGatewayV2.interceptors.request.use(async (config) => {
  const headers = AxiosHeaders.from(config.headers ?? {});
  config.headers = headers;

  if (tokenSupplier) {
    try {
      const token = await tokenSupplier();
      if (token) headers.set('Authorization', `Bearer ${token}`);
      else headers.delete('Authorization');
    } catch {
      headers.delete('Authorization');
    }
  } else {
    headers.delete('Authorization');
  }

  return config;
});

mobileGatewayV2.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const apiError = normalizeApiError(error);

    if (apiError.status === 401 && onUnauthorized) {
      try {
        await onUnauthorized(apiError);
      } catch {
        // Authentication cleanup must not replace the transport error.
      }
    }

    throw apiError;
  },
);

export function setOrvalAuthContext(
  nextTokenSupplier?: TokenSupplier,
  nextUnauthorizedHandler?: UnauthorizedHandler,
) {
  tokenSupplier = nextTokenSupplier;
  onUnauthorized = nextUnauthorizedHandler;
}

export function orvalAxios<T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): OrvalRequestPromise<T> {
  const cancellation = axios.CancelToken.source();
  const request = mobileGatewayV2
    .request<T>({
      ...config,
      ...options,
      headers: {
        ...config.headers,
        ...options?.headers,
      },
      cancelToken: cancellation.token,
    })
    .then((response) => response.data) as OrvalRequestPromise<T>;

  request.cancel = () => cancellation.cancel('Query cancelled');
  return request;
}

function normalizeApiError(error: AxiosError): ApiError {
  if (error.response) {
    const data = error.response.data;
    const problem = asRecord(data);
    const status = error.response.status;
    const requestId =
      readString(problem, 'requestId') ??
      readHeader(error, 'x-request-id') ??
      readHeader(error, 'x-correlation-id');
    const code =
      readString(problem, 'code') ??
      error.code ??
      (status >= 500 ? 'ERR_SERVER' : 'ERR_BAD_REQUEST');
    const message =
      readString(problem, 'detail') ??
      readString(problem, 'title') ??
      readString(problem, 'message') ??
      readString(problem, 'error') ??
      error.message ??
      'Erreur serveur';

    return new ApiError(status, message, data, { code, requestId });
  }

  if (error.request) {
    const isTimeout =
      error.code === 'ECONNABORTED' ||
      error.code === 'ETIMEDOUT' ||
      error.message.toLowerCase().includes('timeout');

    return new ApiError(
      0,
      isTimeout ? 'Délai dépassé.' : 'Serveur injoignable.',
      undefined,
      { code: isTimeout ? 'ERR_TIMEOUT' : 'ERR_NETWORK' },
    );
  }

  return new ApiError(0, error.message, undefined, {
    code: error.code,
  });
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(
  value: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const candidate = value?.[key];
  return typeof candidate === 'string' && candidate.length > 0
    ? candidate
    : undefined;
}

function readHeader(error: AxiosError, key: string): string | undefined {
  const value = error.response?.headers?.[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
