import camelcaseKeys from "camelcase-keys";
import snakecaseKeys from "snakecase-keys";

type JsonContainer = Record<string, unknown> | readonly Record<string, unknown>[];

export const serializeApiJson = (value: JsonContainer) => snakecaseKeys(value, { deep: true });
export const serializeApiQuery = (value: JsonContainer) => snakecaseKeys(value, { deep: true });
export const deserializeApiJson = (value: JsonContainer) => camelcaseKeys(value, { deep: true });
