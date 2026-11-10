import { createContext, useContext, type PropsWithChildren } from "react";
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

/** One season owner shared by Home and its contextual route for the native principal and business UUID. */
export interface PersonalSeasonScope {
  owner: FollowingOwner;
  profile: ReturnType<typeof useCurrentAccount>;
  season: ReturnType<typeof usePersonalSeason>;
  request: (signal?: AbortSignal) => Promise<ApiFetchOptions>;
  admitted: boolean;
  /** Retained same-account reads stay usable after technical failures; follow commands own stricter prerequisites. */
  usable: boolean;
  blocked: boolean;
  bypass: boolean;
}

const PersonalSeasonContext = createContext<PersonalSeasonScope | null>(null);

/** Scopes Home's shared choice to the native principal and business account UUID. */
export function PersonalSeasonProvider({
  children,
}: Readonly<PropsWithChildren>) {
  const session = useAccountSession();
  const profile = useCurrentAccount();
  const owner = captureFollowingOwner(session);
  return owner ? (
    <SeasonScope
      key={`${owner.subject}:${owner.accountId}`}
      owner={owner}
      profile={profile}
    >
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

/** Keeps native credentials and admission around the sole choice; Query withdraws refused options across remounts. */
function SeasonScope({
  owner,
  profile,
  children,
}: Readonly<
  PropsWithChildren<{
    owner: FollowingOwner;
    profile: ReturnType<typeof useCurrentAccount>;
  }>
>) {
  const { getCredentials } = useAccountSession();
  const admission = useOrdinaryRequest();
  const usable =
    admission.admitted &&
    profile.data?.accountId === owner.accountId &&
    !isAccessDenied(profile.error);
  const bypass = Boolean(admission.bypass);

  /** Prepares only a current original-owner request after native credentials and current F12 admission. */
  async function request(signal?: AbortSignal) {
    if (!admission.admitted) {
      throw new ApiError("cancelled");
    }
    const credentials = await getCredentials();
    if (!credentials) {
      throw new ApiError("http", 401);
    }
    return admission.request({
      signal,
      headers: { Authorization: `Bearer ${credentials.accessToken}` },
    });
  }

  const season = usePersonalSeason(owner, request, usable, bypass);
  const refused =
    isAccessDenied(season.options.error) ||
    (season.options.error instanceof ApiError &&
      season.options.error.status === 404);
  const blocked = isAccessDenied(profile.error) || refused;
  return (
    <PersonalSeasonContext
      value={{
        owner,
        profile,
        season,
        request,
        admitted: admission.admitted,
        usable,
        blocked,
        bypass,
      }}
    >
      {children}
    </PersonalSeasonContext>
  );
}
