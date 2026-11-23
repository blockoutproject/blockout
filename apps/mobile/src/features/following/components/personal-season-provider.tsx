import { createContext, useContext, type PropsWithChildren } from "react";
import { useAccountAvailability } from "@/features/accounts/current-account";
import { useOrdinaryRequest } from "@/features/access/ordinary-request";
import { ApiError, type ApiFetchOptions } from "@/shared/api/api-fetch";
import { isResourceReadRefused } from "@/shared/api/access-denied";
import {
  captureFollowingOwner,
  type FollowingOwner,
} from "../api/following-keys";
import { usePersonalSeason } from "../hooks/use-personal-season";

/** One season owner shared by Home and its contextual route for the native principal and business UUID. */
export interface PersonalSeasonScope {
  owner: FollowingOwner;
  season: ReturnType<typeof usePersonalSeason>;
  request: (signal?: AbortSignal) => Promise<ApiFetchOptions>;
  admitted: boolean;
  /** Season reads require current F05 availability and F12 admission. */
  usable: boolean;
  /** A current season-options refusal suspends the selector. */
  blocked: boolean;
  bypass: boolean;
}

const PersonalSeasonContext = createContext<PersonalSeasonScope | null>(null);

/** Retains Home's choice by native principal and business UUID; unrelated destinations can pause season reads. */
export function PersonalSeasonProvider({
  children,
  enabled = true,
}: Readonly<PropsWithChildren<{ enabled?: boolean }>>) {
  const { session, usable: accountUsable } = useAccountAvailability();
  // The owner retains its choice if the native departure is cancelled.
  const owner = captureFollowingOwner(session);
  const { getCredentials } = session;
  const admission = useOrdinaryRequest();
  const usable = accountUsable && admission.admitted;
  const bypass = Boolean(admission.bypass);

  /** Prepares an admitted read with credentials for the captured native owner. */
  async function request(signal?: AbortSignal) {
    if (!usable) {
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

  const season = usePersonalSeason(owner, request, enabled && usable, bypass);
  const blocked = isResourceReadRefused(season.options.error);
  return (
    <PersonalSeasonContext
      value={
        owner
          ? {
              owner,
              season,
              request,
              admitted: admission.admitted,
              usable,
              blocked,
              bypass,
            }
          : null
      }
    >
      {children}
    </PersonalSeasonContext>
  );
}

/** Reads the current shared scope; absent identity supplies no private choice or former account data. */
export function usePersonalSeasonScope() {
  return useContext(PersonalSeasonContext);
}
