import snakecaseKeys from "snakecase-keys";

type JsonContainer = Record<string, unknown> | readonly Record<string, unknown>[];

export const serializeApiJson = <T extends JsonContainer>(value: T): T => value;
export const serializeApiQuery = (value: JsonContainer) => snakecaseKeys(value, { deep: true });
export const deserializeApiJson = <T extends JsonContainer>(value: T): T => value;
