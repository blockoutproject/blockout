package com.blockout.users.account.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.users.account.infrastructure.identity.Auth0IdentityProvider;
import com.blockout.users.account.infrastructure.identity.Auth0TokenManager;
import com.blockout.users.account.infrastructure.storage.S3ProfileImageStorage;
import com.blockout.users.account.persistence.JpaUserAccountStore;
import com.blockout.users.account.persistence.UserAccountEntity;
import com.blockout.users.account.persistence.UserAccountPersistenceMapper;
import com.blockout.users.favorite.application.FavoriteEventPublisher;
import com.blockout.users.favorite.outbound.FavoriteOutboxEventPublisher;
import com.blockout.users.favorite.persistence.FavoritePersistenceMapper;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

/** Guards the MRG-408 account, provider, storage, and persistence boundaries. */
class UserAccountArchitectureTest {

    @Test
    void accountApplicationServicesDependOnlyOnRoleOwnedPorts() {
        assertApplicationFields(UserAccountApplicationService.class);
        assertApplicationFields(UserProfileMutationService.class);
        assertApplicationFields(UserIdentityApplicationService.class);
        assertApplicationFields(UserAccountDeletionService.class);
        assertApplicationFields(ProfileImagePlanExecutor.class);
    }

    @Test
    void persistenceEntityStoreAndMappersStayInsideOwnedAdapters() {
        assertThat(UserAccountEntity.class.getPackageName())
                .isEqualTo("com.blockout.users.account.persistence");
        assertThat(UserAccountEntity.class.getAnnotation(Entity.class).name()).isEqualTo("CustomUser");
        assertThat(UserAccountEntity.class.getAnnotation(Table.class).name()).isEqualTo("users");
        assertThat(JpaUserAccountStore.class.getInterfaces()).containsExactly(UserAccountStore.class);
        assertThat(UserAccountPersistenceMapper.class.getPackageName())
                .isEqualTo("com.blockout.users.account.persistence");
        assertThat(FavoritePersistenceMapper.class.getPackageName())
                .isEqualTo("com.blockout.users.favorite.persistence");
    }

    @Test
    void vendorAdaptersExposeOnlyApplicationOwnedPorts() {
        assertThat(Auth0IdentityProvider.class.getInterfaces()).containsExactly(IdentityProvider.class);
        assertThat(Auth0TokenManager.class.getPackageName())
                .isEqualTo("com.blockout.users.account.infrastructure.identity");
        assertThat(S3ProfileImageStorage.class.getInterfaces()).containsExactly(ProfileImageStorage.class);
        assertThat(FavoriteOutboxEventPublisher.class.getInterfaces())
                .containsExactly(FavoriteEventPublisher.class, AccountDeletionEventPublisher.class);
    }

    @Test
    void accountMutationsRetainApplicationTransactionOwnership() throws NoSuchMethodException {
        assertThat(UserIdentityApplicationService.class
                        .getMethod("ensureCurrent", String.class)
                        .getAnnotation(Transactional.class))
                .isNotNull();
        assertThat(UserAccountDeletionService.class
                        .getMethod("delete", String.class)
                        .getAnnotation(Transactional.class))
                .isNotNull();
        assertThat(UserProfileMutationService.class
                        .getMethod("update", String.class, UpdateUserProfileCommand.class)
                        .getAnnotation(Transactional.class))
                .isNotNull();
    }

    private void assertApplicationFields(Class<?> type) {
        assertThat(Arrays.stream(type.getDeclaredFields())
                .filter(field -> !Modifier.isStatic(field.getModifiers()))
                .map(field -> field.getType()))
                .allMatch(fieldType -> fieldType.getPackageName().equals("com.blockout.users.account.application"));
    }
}
