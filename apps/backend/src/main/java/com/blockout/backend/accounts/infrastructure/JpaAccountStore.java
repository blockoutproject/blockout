package com.blockout.backend.accounts.infrastructure;

import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.accounts.application.ProfilePhoto;
import com.blockout.backend.accounts.application.exception.AccountCreationConflictException;
import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import com.blockout.backend.accounts.application.exception.UsernameUnavailableException;
import com.blockout.backend.accounts.domain.Account;
import com.blockout.backend.generated.mobile.model.ProfilePhotoActionEnum;
import com.blockout.backend.shared.image.ImageObjects;
import com.blockout.backend.shared.image.ImageObjects.Category;
import java.util.Optional;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** JPA account adapter; write and lock operations require the caller's transaction. */
@Repository
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
public class JpaAccountStore implements AccountStore {
  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public String erase(UUID accountId) {
    AccountEntity original = accounts.findById(accountId).orElseThrow();
    accounts.delete(original);
    accounts.flush();
    return original.getPhotoKey();
  }

  /** {@inheritDoc} */
  @Override
  public java.util.Map<UUID, String> displayNames(java.util.Set<UUID> ids) {
    if (ids.isEmpty()) {
      return java.util.Map.of();
    }
    return accounts.findNames(ids).stream()
        .collect(
            java.util.stream.Collectors.toUnmodifiableMap(
                AccountRepository.Name::getId, AccountRepository.Name::getUsername));
  }

  private final AccountRepository accounts;
  private final ImageObjects images;
  private final AccountPersistenceMapper mapper;

  /** {@inheritDoc} */
  @Override
  public Optional<UUID> findIdByPrincipal(String issuer, String subject) {
    return accounts.findIdByIssuerAndSubject(issuer, subject);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<Account> findByPrincipal(String issuer, String subject) {
    return accounts.findByIssuerAndSubject(issuer, subject).map(mapper::toDomain);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<Account> findById(UUID id) {
    return accounts.findById(id).map(mapper::toDomain);
  }

  /** {@inheritDoc} */
  @Override
  public boolean hasPhoto(UUID id) {
    return accounts.findById(id).map(AccountEntity::getPhotoKey).isPresent();
  }

  /** {@inheritDoc} */
  @Override
  public Optional<ProfilePhoto> photo(String issuer, String subject, UUID id) {
    return accounts
        .findByIdAndIssuerAndSubjectAndPhotoKeyIsNotNull(id, issuer, subject)
        .map(
            account ->
                new ProfilePhoto(images.read(account.getPhotoKey()), account.getPhotoMediaType()));
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public void changeProfile(
      UUID id, String username, ProfilePhotoActionEnum photoAction, ProfilePhoto photo) {
    try {
      AccountEntity account = accounts.findById(id).orElseThrow();
      if (username != null) {
        account.setUsername(username);
      }
      if (photoAction != null) {
        byte[] bytes = photo == null ? null : photo.bytes();
        String mediaType = photo == null ? null : photo.mediaType();
        account.replacePhoto(
            images.replace(Category.PROFILES, account.getPhotoKey(), bytes, mediaType), mediaType);
      }
      // Flush before returning so only the named username constraint becomes a business refusal.
      accounts.flush();
    } catch (DataIntegrityViolationException failure) {
      if ("uk_account_username".equals(constraintName(failure))) {
        throw new UsernameUnavailableException();
      }
      throw failure;
    }
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public Optional<Account> lockById(UUID id) {
    return accounts.findByIdForUpdate(id).map(mapper::toDomain);
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public Account create(String issuer, String subject, String username, String email) {
    try {
      // The principal winner is read after rollback; a generated-name collision is an ordinary
      // failure.
      return mapper.toDomain(
          accounts.saveAndFlush(new AccountEntity(issuer, subject, username, email)));
    } catch (DataIntegrityViolationException failure) {
      String constraint = constraintName(failure);
      if ("uk_account_principal".equals(constraint)) {
        throw new AccountCreationConflictException(failure);
      }
      if ("uk_account_username".equals(constraint)) {
        throw new AccountUnavailableException(failure);
      }
      throw failure;
    }
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public Optional<Account> synchronize(UUID id, String email) {
    return accounts
        .findByIdForUpdate(id)
        .map(
            entity -> {
              if (email != null && !email.isBlank()) {
                entity.setEmail(email);
              }
              return mapper.toDomain(entity);
            });
  }

  /**
   * Reads the database constraint identity without inferring a business refusal from SQL text.
   *
   * @param failure translated persistence failure
   * @return exact named constraint, or null for another integrity failure
   */
  private static String constraintName(DataIntegrityViolationException failure) {
    for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
      if (cause instanceof ConstraintViolationException constraint) {
        return constraint.getConstraintName();
      }
    }
    return null;
  }
}
