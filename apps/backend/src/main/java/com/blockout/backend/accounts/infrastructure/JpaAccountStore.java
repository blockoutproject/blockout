package com.blockout.backend.accounts.infrastructure;

import com.blockout.backend.accounts.application.AccountStore;
import com.blockout.backend.accounts.domain.Account;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** JPA account adapter; write and lock operations require the caller's transaction. */
@Repository
@RequiredArgsConstructor(access = AccessLevel.PACKAGE)
public class JpaAccountStore implements AccountStore {
  private final AccountRepository accounts;
  private final AccountPersistenceMapper mapper;

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
  @Transactional(propagation = Propagation.MANDATORY)
  public Optional<Account> lockById(UUID id) {
    return accounts.lockById(id).map(mapper::toDomain);
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public Account create(
      String issuer, String subject, String username, String email, Instant principalCreatedAt) {
    return mapper.toDomain(
        accounts.save(new AccountEntity(issuer, subject, username, email, principalCreatedAt)));
  }

  /** {@inheritDoc} */
  @Override
  @Transactional(propagation = Propagation.MANDATORY)
  public Optional<Account> synchronize(UUID id, String email, Instant principalCreatedAt) {
    return accounts
        .lockById(id)
        .map(
            entity -> {
              Account updated =
                  mapper.toDomain(entity).withPrincipalEvidence(email, principalCreatedAt);
              entity.setEmail(updated.email());
              entity.setPrincipalCreatedAt(updated.principalCreatedAt());
              return updated;
            });
  }
}
