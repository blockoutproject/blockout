import { useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CURRENT_USER_QUERY_KEY } from "@/src/hooks/user/useEnsureUser";
import { useApis } from "@/src/shared/providers/ApiProvider";
import {
  useSessionActions,
  useSessionState,
} from "@/src/shared/providers/SessionContext";
import type { CustomUser } from "@/src/types/User";
import { EntityType } from "@/src/types/User";

type FollowableEntity = {
  id: number;
  followersCount: number;
};

type FollowMutationContext<T extends FollowableEntity> = {
  previousEntity: T;
  previousUser: CustomUser;
};

const updateFavorite = (
  user: CustomUser,
  entityType: EntityType,
  entityId: number,
  isFollowing: boolean,
): CustomUser => {
  const favorites = user.favorites ?? [];
  const withoutEntity = favorites.filter(
    (favorite) =>
      favorite.entityType !== entityType || favorite.entityId !== entityId,
  );

  return {
    ...user,
    favorites: isFollowing
      ? [...withoutEntity, { entityType, entityId }]
      : withoutEntity,
  };
};

export function useFollowState<T extends FollowableEntity>(
  queryNamespace: string,
  entityType: EntityType,
  entity: T,
) {
  const { customUser } = useSessionState();
  const { refetch } = useSessionActions();
  const { mobile } = useApis();
  const queryClient = useQueryClient();
  const entityQueryKey = useMemo(
    () => [queryNamespace, entity.id] as const,
    [entity.id, queryNamespace],
  );

  const isFollowing =
    customUser?.favorites?.some(
      (favorite) =>
        favorite.entityType === entityType && favorite.entityId === entity.id,
    ) ?? false;

  const { isPending, mutate } = useMutation<
    void,
    unknown,
    boolean,
    FollowMutationContext<T> | undefined
  >({
    mutationFn: async (nextIsFollowing) => {
      if (nextIsFollowing) {
        await mobile.users.follow(entityType, entity.id);
      } else {
        await mobile.users.unfollow(entityType, entity.id);
      }

      await refetch();
    },
    onMutate: async (nextIsFollowing) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: CURRENT_USER_QUERY_KEY }),
        queryClient.cancelQueries({ queryKey: entityQueryKey }),
      ]);

      const previousUser =
        queryClient.getQueryData<CustomUser>(CURRENT_USER_QUERY_KEY) ??
        customUser;
      const previousEntity =
        queryClient.getQueryData<T>(entityQueryKey) ?? entity;

      if (!previousUser) return undefined;

      queryClient.setQueryData<CustomUser>(
        CURRENT_USER_QUERY_KEY,
        updateFavorite(previousUser, entityType, entity.id, nextIsFollowing),
      );
      queryClient.setQueryData<T>(entityQueryKey, {
        ...previousEntity,
        followersCount: Math.max(
          0,
          previousEntity.followersCount + (nextIsFollowing ? 1 : -1),
        ),
      });

      return { previousEntity, previousUser };
    },
    onError: (_error, _nextIsFollowing, context) => {
      if (!context) return;
      queryClient.setQueryData(CURRENT_USER_QUERY_KEY, context.previousUser);
      queryClient.setQueryData(entityQueryKey, context.previousEntity);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: entityQueryKey });
    },
  });

  const onToggleFollow = useCallback(() => {
    if (!customUser || isPending) return;
    mutate(!isFollowing);
  }, [customUser, isFollowing, isPending, mutate]);

  return {
    isFollowing,
    isProcessing: isPending,
    followersCount: entity.followersCount ?? 0,
    onToggleFollow,
  };
}
