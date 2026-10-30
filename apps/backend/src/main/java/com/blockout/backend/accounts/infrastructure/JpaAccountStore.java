package com.blockout.backend.accounts.infrastructure;

import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.accounts.application.ProfilePhoto;
import com.blockout.backend.accounts.application.exception.AccountCreationConflictException;
import com.blockout.backend.accounts.application.exception.UsernameUnavailableException;
import com.blockout.backend.accounts.domain.Account;
import com.blockout.backend.generated.mobile.model.ProfilePhotoActionEnum;
import java.time.Instant;
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
  public java.util.Map<UUID, String> displayNames(java.util.Set<UUID> ids) {
    if (ids.isEmpty()) return java.util.Map.of();
    return accounts.findNames(ids).stream()
        .collect(
            java.util.stream.Collectors.toUnmodifiableMap(
                AccountRepository.Name::getId, AccountRepository.Name::getUsername));
  }

  private final AccountRepository accounts;
  private final AccountPhotoRepository photos;
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
    return photos.existsByIdAndBytesIsNotNull(id);
  }

  /** {@inheritDoc} */
  @Override
  public Optional<ProfilePhoto> photo(UUID id) {
    return photos.findById(id).map(AccountPhotoEntity::photo);
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public void changeProfile(
      UUID id, String username, ProfilePhotoActionEnum photoAction, ProfilePhoto photo) {
    try {
      if (username != null) accounts.findById(id).orElseThrow().setUsername(username);
      if (photoAction != null) photos.findById(id).orElseThrow().replace(photo);
      // Flush before returning so only the named username constraint becomes a business refusal.
      accounts.flush();
    } catch (DataIntegrityViolationException failure) {
      if ("uk_account_username".equals(constraintName(failure)))
        throw new UsernameUnavailableException();
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
  public Account create(
      String issuer, String subject, String username, String email, Instant principalCreatedAt) {
    try {
      // Immediate uniqueness must be translated here, then retried only after caller rollback.
      return mapper.toDomain(
          accounts.saveAndFlush(
              new AccountEntity(issuer, subject, username, email, principalCreatedAt)));
    } catch (DataIntegrityViolationException failure) {
      String constraint = constraintName(failure);
      if ("uk_account_principal".equals(constraint) || "uk_account_username".equals(constraint))
        throw new AccountCreationConflictException(failure);
      throw failure;
    }
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public Optional<Account> synchronize(UUID id, String email, Instant principalCreatedAt) {
    return accounts
        .findByIdForUpdate(id)
        .map(
            entity -> {
              Account updated =
                  mapper.toDomain(entity).withPrincipalEvidence(email, principalCreatedAt);
              entity.setEmail(updated.email());
              entity.setPrincipalCreatedAt(updated.principalCreatedAt());
              return updated;
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
      if (cause instanceof ConstraintViolationException constraint)
        return constraint.getConstraintName();
    }
    return null;
  }
}
