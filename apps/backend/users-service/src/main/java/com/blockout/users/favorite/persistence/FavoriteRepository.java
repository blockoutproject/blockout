package com.blockout.users.favorite.persistence;

import com.blockout.users.account.persistence.UserAccountEntity;
import com.blockout.shared.model.EntityTypeEnum;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/** Spring Data owner of the existing canonical favorite rows. */
@Repository
public interface FavoriteRepository extends JpaRepository<FavoriteEntity, Long> {

    boolean existsByUserAndEntityTypeAndEntityId(UserAccountEntity user, EntityTypeEnum type, Long entityId);

    int deleteByUserAndEntityTypeAndEntityId(UserAccountEntity user, EntityTypeEnum type, Long entityId);

    List<FavoriteEntity> findByUserId(Long userId);

    List<FavoriteEntity> findByUserIdAndEntityType(Long userId, EntityTypeEnum entityType);

    Page<FavoriteEntity> findByUserId(Long userId, Pageable pageable);

    Page<FavoriteEntity> findByUserIdAndEntityType(Long userId, EntityTypeEnum entityType, Pageable pageable);

    long countByEntityTypeAndEntityId(EntityTypeEnum entityType, Long entityId);
}
