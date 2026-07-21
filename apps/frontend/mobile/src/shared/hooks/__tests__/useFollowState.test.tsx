import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { CURRENT_USER_QUERY_KEY } from "@/src/hooks/user/useEnsureUser";
import { useFollowState } from "@/src/shared/hooks/useFollowState";
import {
  SessionActions,
  SessionContextProvider,
  SessionState,
} from "@/src/shared/providers/SessionContext";
import { CustomUser, EntityType } from "@/src/types/User";

const mockFollow = jest.fn();
const mockUnfollow = jest.fn();

jest.mock("@/src/shared/providers/ApiProvider", () => ({
  useApis: () => ({
    mobile: {
      users: {
        follow: mockFollow,
        unfollow: mockUnfollow,
      },
    },
  }),
}));

const user: CustomUser = {
  id: 1,
  auth0Id: "auth0|test",
  email: "test@example.com",
  pseudo: "Test",
  firstName: null,
  lastName: null,
  pictureUrl: null,
  phoneNumber: null,
  favorites: [],
  active: true,
  createdAt: "2026-07-21T00:00:00Z",
  lastUpdate: "2026-07-21T00:00:00Z",
};

const baseState: SessionState = {
  auth0User: { sub: user.auth0Id },
  customUser: user,
  isLoading: false,
  isError: false,
  isAuthenticated: true,
  isGuest: false,
  error: null,
  customUserError: null,
  auth0UserError: null,
  appStatus: undefined,
  isAppStatusLoading: false,
  isAppStatusError: false,
  isMaintenance: false,
  maintenanceBypass: false,
  canBypassMaintenance: false,
  isUpdateRequired: false,
  updateBypass: false,
  canBypassUpdate: false,
  appUpdateUrl: null,
  isBootstrapped: true,
};

const createActions = (refetch: jest.Mock): SessionActions => ({
  signIn: jest.fn().mockResolvedValue(undefined),
  continueAsGuest: jest.fn(),
  leaveGuest: jest.fn().mockResolvedValue(undefined),
  signOutLocal: jest.fn().mockResolvedValue(undefined),
  signOutSSO: jest.fn().mockResolvedValue(undefined),
  softResetAuth: jest.fn().mockResolvedValue(undefined),
  bypassMaintenance: jest.fn(),
  resetBypassMaintenance: jest.fn(),
  bypassUpdate: jest.fn(),
  resetBypassUpdate: jest.fn(),
  refetch,
  refetchAppStatus: jest.fn().mockResolvedValue(undefined),
});

const createWrapper = (queryClient: QueryClient, refetch: jest.Mock) =>
  function Wrapper({ children }: React.PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <SessionContextProvider
          actions={createActions(refetch)}
          state={baseState}
        >
          {children}
        </SessionContextProvider>
      </QueryClientProvider>
    );
  };

describe("follow state", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("optimistically stores server facts in the Query cache", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: 0 } },
    });
    const refetch = jest.fn().mockResolvedValue(undefined);
    const pool = { id: 42, followersCount: 7 };
    const poolKey = ["enrichedPools", pool.id] as const;
    queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user);
    queryClient.setQueryData(poolKey, pool);
    mockFollow.mockResolvedValue(undefined);

    const { result, unmount } = await renderHook(
      () => useFollowState("enrichedPools", EntityType.POOL, pool),
      { wrapper: createWrapper(queryClient, refetch) },
    );

    await act(async () => {
      result.current.onToggleFollow();
    });

    await waitFor(() =>
      expect(mockFollow).toHaveBeenCalledWith(EntityType.POOL, pool.id),
    );
    expect(
      queryClient.getQueryData<CustomUser>(CURRENT_USER_QUERY_KEY)?.favorites,
    ).toEqual([{ entityType: EntityType.POOL, entityId: pool.id }]);
    expect(queryClient.getQueryData<typeof pool>(poolKey)?.followersCount).toBe(
      8,
    );
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
    await act(async () => {
      unmount();
    });
    queryClient.clear();
  });

  it("restores both cached facts when the mutation fails", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: 0 } },
    });
    const refetch = jest.fn().mockResolvedValue(undefined);
    const team = { id: 7, followersCount: 3 };
    const teamKey = ["enrichedTeams", team.id] as const;
    queryClient.setQueryData(CURRENT_USER_QUERY_KEY, user);
    queryClient.setQueryData(teamKey, team);
    mockFollow.mockRejectedValue(new Error("network"));

    const { result, unmount } = await renderHook(
      () => useFollowState("enrichedTeams", EntityType.TEAM, team),
      { wrapper: createWrapper(queryClient, refetch) },
    );

    await act(async () => {
      result.current.onToggleFollow();
    });

    await waitFor(() => expect(result.current.isProcessing).toBe(false));
    expect(
      queryClient.getQueryData<CustomUser>(CURRENT_USER_QUERY_KEY),
    ).toEqual(user);
    expect(queryClient.getQueryData(teamKey)).toEqual(team);
    expect(refetch).not.toHaveBeenCalled();
    await act(async () => {
      unmount();
    });
    queryClient.clear();
  });
});
