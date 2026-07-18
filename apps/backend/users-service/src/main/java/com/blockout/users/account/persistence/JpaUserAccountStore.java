package com.blockout.users.account.persistence;

import com.blockout.users.account.application.NewUserAccount;
import com.blockout.users.account.application.UserAccountChange;
import com.blockout.users.account.application.UserAccountPersistenceException;
import com.blockout.users.account.application.UserAccountStore;
import com.blockout.users.account.application.UserAccountUpdate;
import com.blockout.users.account.application.UserAccountView;
import com.blockout.users.account.application.UserIdentitySynchronization;
import com.blockout.users.account.application.UserProfileChange;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;

/** JPA adapter for account reads, creation, mutation, and retained local deletion. */
@Component
@RequiredArgsConstructor
public class JpaUserAccountStore implements UserAccountStore {

    private final UserAccountRepository repository;
    private final UserAccountPersistenceMapper mapper;

    @Override
    public Optional<UserAccountView> findByAuth0Id(String auth0Id) {
        return repository.findByAuth0IdWithFavorites(auth0Id).map(mapper::toView);
    }

    @Override
    public Optional<UserAccountUpdate> findForUpdateByAuth0Id(String auth0Id) {
        return repository.findByAuth0Id(auth0Id).map(JpaUserAccountUpdate::new);
    }

    @Override
    public Optional<UserAccountUpdate> findForUpdateByEmail(String email) {
        return repository.findByEmailIgnoreCase(email).map(JpaUserAccountUpdate::new);
    }

    @Override
    public boolean existsByPseudoIgnoringCaseExcept(String pseudo, Long accountId) {
        return repository.existsByPseudoIgnoreCaseAndIdNot(pseudo, accountId);
    }

    @Override
    public boolean existsByPseudoIgnoringCase(String pseudo) {
        return repository.existsByPseudoIgnoreCase(pseudo);
    }

    @Override
    public UserAccountView create(NewUserAccount account) {
        try {
            return mapper.toView(repository.save(mapper.toEntity(account)));
        } catch (DataIntegrityViolationException exception) {
            throw new UserAccountPersistenceException(exception);
        }
    }

    /** Retains one managed entity for the complete application transaction. */
    private final class JpaUserAccountUpdate implements UserAccountUpdate {

        private final UserAccountEntity entity;

        private JpaUserAccountUpdate(UserAccountEntity entity) {
            this.entity = entity;
        }

        @Override
        public UserAccountView current() {
            return mapper.toView(entity);
        }

        @Override
        public UserAccountChange synchronize(UserIdentitySynchronization synchronization) {
            UserAccountView before = current();
            entity.setEmail(synchronization.email());
            entity.setFirstName(synchronization.firstName());
            entity.setLastName(synchronization.lastName());
            entity.setPhoneNumber(synchronization.phoneNumber());
            entity.setLastUpdate(synchronization.lastUpdate());
            return save(before);
        }

        @Override
        public UserAccountChange updateProfile(UserProfileChange change) {
            UserAccountView before = current();
            if (change.replacePseudo()) {
                entity.setPseudo(change.pseudo());
            }
            if (change.replacePicture()) {
                entity.setPictureUrl(change.pictureUrl());
            }
            entity.setActive(change.active());
            return save(before);
        }

        @Override
        public void delete() {
            repository.delete(entity);
        }

        private UserAccountChange save(UserAccountView before) {
            try {
                return new UserAccountChange(before, mapper.toView(repository.save(entity)));
            } catch (DataIntegrityViolationException exception) {
                throw new UserAccountPersistenceException(exception);
            }
        }
    }
}
