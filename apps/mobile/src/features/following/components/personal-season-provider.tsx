import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";
import { useAuth0 } from "react-native-auth0";
import {
  useAccountSession,
  useCurrentAccount,
} from "../../accounts/current-account";
import { useOrdinaryRequest } from "../../access/ordinary-request";
import { ApiError, type ApiFetchOptions } from "../../../shared/api/api-fetch";
import { isAccessDenied } from "../../../shared/api/access-denied";
import {
  captureFollowingOwner,
  type FollowingOwner,
} from "../api/following-keys";
import { usePersonalSeason } from "../hooks/use-personal-season";

/** One existing season owner shared by Home and its contextual route, scoped to the current account generation. */
export interface PersonalSeasonScope {
  owner: FollowingOwner;
  profile: ReturnType<typeof useCurrentAccount>;
  season: ReturnType<typeof usePersonalSeason>;
  request: (signal?: AbortSignal) => Promise<ApiFetchOptions>;
  usable: boolean;
  blocked: boolean;
  bypass: boolean;
}

const PersonalSeasonContext = createContext<PersonalSeasonScope | null>(null);

/** Lifts the existing in-memory choice only to Home's layout; neither another cache nor a route-parameter callback is created. */
export function PersonalSeasonProvider({ children }: PropsWithChildren) {
  const session = useAccountSession();
  const profile = useCurrentAccount();
  const owner = captureFollowingOwner(session);
  return owner ? (
    <SeasonScope key={owner.generation} owner={owner} profile={profile}>
      {children}
    </SeasonScope>
  ) : (
    <PersonalSeasonContext value={null}>{children}</PersonalSeasonContext>
  );
}

/** Reads the current shared scope; absent identity supplies no private choice or former account data. */
export function usePersonalSeasonScope() {
  return useContext(PersonalSeasonContext);
}

/** Keeps native credentials, current admission and retained-refusal rules around the unchanged season hook. */
function SeasonScope({
  owner,
  profile,
  children,
}: PropsWithChildren<{
  owner: FollowingOwner;
  profile: ReturnType<typeof useCurrentAccount>;
}>) {
  const { getCredentials } = useAuth0();
  const admission = useOrdinaryRequest();
  const usable =
    admission.admitted &&
    profile.isSuccess &&
    profile.data.accountId === owner.accountId;
  const bypass = Boolean(admission.bypass);

  /** Prepares only a current original-owner request after native credentials and current F12 admission. */
  async function request(signal?: AbortSignal) {
    if (!owner.isCurrent(owner.generation)) throw new ApiError("cancelled");
    const credentials = await getCredentials();
    if (!credentials) throw new ApiError("http", 401);
    return admission.request({
      signal,
      session: owner,
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
  }
  const season = usePersonalSeason(owner, request, usable, bypass);
  const [optionsRefused, setOptionsRefused] = useState(false);
  const refused =
    isAccessDenied(season.options.error) ||
    (season.options.error instanceof ApiError &&
      season.options.error.status === 404);
  // A later transient error cannot release a known restriction on retained private options.
  if (refused && !optionsRefused) setOptionsRefused(true);
  else if (optionsRefused && season.options.isSuccess) setOptionsRefused(false);
  const blocked = isAccessDenied(profile.error) || refused || optionsRefused;
  return (
    <PersonalSeasonContext
      value={{ owner, profile, season, request, usable, blocked, bypass }}
    >
      {children}
    </PersonalSeasonContext>
  );
}
