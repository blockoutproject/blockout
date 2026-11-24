package com.blockout.backend.accounts.application;

import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.accounts.domain.Account;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Serves the original holder's profile and reads the photo after local authorization. */
@Service
@RequiredArgsConstructor
public class ReadAccount {
  private final AccountStore accounts;
  private final CurrentPermissions permissions;

  /**
   * Reads the existing principal mapping without bootstrap or provider synchronization.
   *
   * @param issuer validated issuer
   * @param subject validated subject
   * @return current private account
   * @throws AccountNotFoundException when the local account is absent
   */
  @Transactional(readOnly = true)
  public View current(String issuer, String subject) {
    return view(
        accounts
            .findByPrincipal(issuer, subject)
            .orElseThrow(() -> new AccountNotFoundException()));
  }

  /**
   * Reads only the caller's original lifecycle; another owner's UUID is deliberately hidden.
   *
   * @param issuer validated issuer
   * @param subject validated subject
   * @param id original account UUID
   * @return private original account
   * @throws AccountNotFoundException when absent or owned by a different principal
   */
  @Transactional(readOnly = true)
  public View original(String issuer, String subject, UUID id) {
    return view(
        accounts
            .findById(id)
            .filter(account -> account.belongsTo(issuer, subject))
            .orElseThrow(() -> new AccountNotFoundException()));
  }

  /**
   * Reads the private S3 photo after the original-owner reference lookup completes.
   *
   * @param issuer validated issuer
   * @param subject validated subject
   * @param id original business UUID
   * @return accepted PNG/JPEG bytes
   * @throws AccountNotFoundException when the account/photo is absent or belongs to another owner
   */
  public ProfilePhoto photo(String issuer, String subject, UUID id) {
    return accounts.photo(issuer, subject, id).orElseThrow(AccountNotFoundException::new);
  }

  /**
   * Composes current local presentation facts inside this read transaction.
   *
   * @param account already authorized local account
   * @return local profile, photo presence and current F12 grants
   */
  private View view(Account account) {
    return new View(account, accounts.hasPhoto(account.id()), permissions.forAccount(account.id()));
  }

  /**
   * Local account and current F12 presentation capabilities, never authorization for a future
   * write.
   *
   * @param account usable account
   * @param hasPhoto accepted-photo presence
   * @param permissions current independent grants
   */
  public record View(Account account, boolean hasPhoto, Set<Permission> permissions) {}
}
