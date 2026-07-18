package com.blockout.users.favorite.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.users.favorite.persistence.FavoriteEntity;
import com.blockout.users.favorite.persistence.FavoritePersistenceMapper;
import com.blockout.users.favorite.persistence.JpaFavoriteStore;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

/** Guards the MRG-425 canonical favorite and derived-projection boundaries. */
class FavoriteArchitectureTest {

    @Test
    void favoriteApplicationDependsOnlyOnRoleOwnedTypes() {
        assertThat(Arrays.stream(UserFavoriteApplicationService.class.getDeclaredFields())
                .filter(field -> !Modifier.isStatic(field.getModifiers()))
                .map(field -> field.getType().getPackageName()))
                .allMatch("com.blockout.users.favorite.application"::equals);
        assertThat(Arrays.stream(FavoriteProjectionCoordinator.class.getDeclaredFields())
                .filter(field -> !Modifier.isStatic(field.getModifiers()))
                .map(field -> field.getType().getPackageName()))
                .allMatch("com.blockout.users.favorite.application"::equals);
    }

    @Test
    void persistenceEntityStoreAndMapperStayInsideFavoriteAdapter() {
        assertThat(FavoriteEntity.class.getPackageName()).isEqualTo("com.blockout.users.favorite.persistence");
        assertThat(FavoriteEntity.class.getAnnotation(Entity.class).name()).isEqualTo("UserFavorite");
        assertThat(FavoriteEntity.class.getAnnotation(Table.class).name()).isEqualTo("user_favorites");
        assertThat(JpaFavoriteStore.class.getInterfaces()).containsExactly(FavoriteStore.class);
        assertThat(FavoritePersistenceMapper.class.getPackageName())
                .isEqualTo("com.blockout.users.favorite.persistence");
    }

    @Test
    void canonicalTransitionsRetainApplicationTransactionOwnership() throws NoSuchMethodException {
        assertThat(UserFavoriteApplicationService.class
                        .getMethod("follow", FavoriteCommand.class)
                        .getAnnotation(Transactional.class))
                .isNotNull();
        assertThat(UserFavoriteApplicationService.class
                        .getMethod("unfollow", FavoriteCommand.class)
                        .getAnnotation(Transactional.class))
                .isNotNull();
    }
}
