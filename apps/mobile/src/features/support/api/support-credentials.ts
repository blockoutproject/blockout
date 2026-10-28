import { ApiError } from "../../../shared/api/api-fetch";

/** Ordinary support never consults credentials; F12's existing request owner still validates explicit bypass intent. */
export async function supportCredentials(
  bypassRequested: boolean,
  getCredentials: () => Promise<{ accessToken: string } | null | undefined>,
): Promise<Record<string, string>> {
  if (!bypassRequested) return {};
  const credentials = await getCredentials();
  if (!credentials?.accessToken) throw new ApiError("http", 401);
  return { Authorization: `Bearer ${credentials.accessToken}` };
}
