import type { MobileUser } from '@/src/api/generated/mobile-gateway/models';
import type { CustomUser } from '@/src/types/User';
import { EntityType } from '@/src/types/User';

/** Projects the canonical session user without leaking generated models. */
export function toCustomUser(response: MobileUser): CustomUser {
  return {
    id: response.id,
    auth0Id: response.auth0Id,
    email: response.email,
    pseudo: response.pseudo,
    pictureUrl: response.pictureUrl,
    favorites:
      response.favorites?.map((favorite) => ({
        entityType:
          favorite.entityType === 'TEAM' ? EntityType.TEAM : EntityType.POOL,
        entityId: favorite.entityId,
      })) ?? null,
  };
}
