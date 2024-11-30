import { POOL_API_URL, TEAM_API_URL, MATCH_API_URL } from '@env';
import createHttpClientWithBaseURL from "./httpClientFactory";

export const poolsClient = createHttpClientWithBaseURL(POOL_API_URL);
export const teamsClient = createHttpClientWithBaseURL(TEAM_API_URL);
export const matchesClient = createHttpClientWithBaseURL(MATCH_API_URL);