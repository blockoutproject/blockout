package com.blockout.users.favorite.persistence;

import com.blockout.users.account.persistence.UserAccountEntity;
import com.blockout.users.account.persistence.UserAccountRepository;
import com.blockout.users.favorite.application.FavoriteChange;
import com.blockout.users.favorite.application.FavoriteEventAction;
import com.blockout.users.favorite.application.FavoriteOwner;
import com.blockout.users.favorite.application.FavoritePage;
import com.blockout.users.favorite.application.FavoriteProjectionSnapshot;
import com.blockout.users.favorite.application.FavoriteStore;
import com.blockout.users.favorite.application.FavoriteTarget;
import com.blockout.users.favorite.application.FavoriteView;
import com.blockout.users.favorite.application.FollowerCountSnapshot;
import com.blockout.users.models.enums.EntityType;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Component;

/** JPA adapter for canonical favorite reads, transitions, and bounded rebuild snapshots. */
@Component
@RequiredArgsConstructor
public class JpaFavoriteStore implements FavoriteStore {

    private static final Sort CANONICAL_ORDER = Sort.by("createdAt").ascending().and(Sort.by("id").ascending());

    private final FavoriteRepository favorites;
    private final UserAccountRepository users;
    private final FavoritePersistenceMapper mapper;

    @Override
    public Optional<FavoriteOwner> findOwnerByAuth0Id(String auth0Id) {
        return users.findByAuth0Id(auth0Id).map(JpaFavoriteOwner::new);
    }

    @Override
    public boolean ownerExists(Long userId) {
        return users.existsById(userId);
    }

    @Override
    public List<FavoriteView> findUnpaged(Long userId, EntityType entityType) {
        List<FavoriteEntity> result = entityType == null
                ? favorites.findByUserId(userId)
                : favorites.findByUserIdAndEntityType(userId, entityType);
        return result.stream().map(mapper::toView).toList();
    }

    @Override
    public FavoritePage findPage(Long userId, EntityType entityType, int page, int pageSize) {
        PageRequest request = PageRequest.of(page, pageSize, CANONICAL_ORDER);
        Page<FavoriteEntity> result = entityType == null
                ? favorites.findByUserId(userId, request)
                : favorites.findByUserIdAndEntityType(userId, entityType, request);
        return new FavoritePage(
                result.getContent().stream().map(mapper::toView).toList(),
                page,
                pageSize,
                result.getTotalElements(),
                result.hasNext());
    }

    @Override
    public FavoriteProjectionSnapshot snapshotForUser(Long userId) {
        LinkedHashSet<FavoriteTarget> targets = new LinkedHashSet<>();
        favorites.findByUserId(userId).forEach(favorite ->
                targets.add(new FavoriteTarget(favorite.getEntityType(), favorite.getEntityId())));
        return new FavoriteProjectionSnapshot(userId, targets);
    }

    @Override
    public FollowerCountSnapshot snapshotForTarget(EntityType entityType, Long entityId) {
        FavoriteTarget target = new FavoriteTarget(entityType, entityId);
        return new FollowerCountSnapshot(target, favorites.countByEntityTypeAndEntityId(entityType, entityId));
    }

    /** Retains the resolved account entity for the complete favorite transaction. */
    private final class JpaFavoriteOwner implements FavoriteOwner {

        private final UserAccountEntity user;

        private JpaFavoriteOwner(UserAccountEntity user) {
            this.user = user;
        }

        @Override
        public Long userId() {
            return user.getId();
        }

        @Override
        public Optional<FavoriteChange> follow(FavoriteTarget target) {
            if (favorites.existsByUserAndEntityTypeAndEntityId(
                    user, target.entityType(), target.entityId())) {
                return Optional.empty();
            }
            FavoriteEntity saved = favorites.save(FavoriteEntity.builder()
                    .user(user)
                    .entityType(target.entityType())
                    .entityId(target.entityId())
                    .build());
            return Optional.of(new FavoriteChange(
                    user.getId(), target, FavoriteEventAction.FOLLOWED, saved.getId()));
        }

        @Override
        public Optional<FavoriteChange> unfollow(FavoriteTarget target) {
            int deleted = favorites.deleteByUserAndEntityTypeAndEntityId(
                    user, target.entityType(), target.entityId());
            if (deleted == 0) {
                return Optional.empty();
            }
            return Optional.of(new FavoriteChange(
                    user.getId(), target, FavoriteEventAction.UNFOLLOWED, null));
        }
    }
}
