package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.accounts.application.exception.InvalidProfileChangeException;
import com.blockout.backend.accounts.application.exception.UsernameUnavailableException;
import com.blockout.backend.generated.mobile.model.ProfilePhotoActionEnum;
import com.blockout.backend.shared.validation.TextTrimming;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Applies supplied profile fields to the original owner in one short local transaction. */
@Service
@RequiredArgsConstructor
public class ChangeAccountProfile {
  private final AccountStore accounts;
  private final ReadAccount reads;

  /**
   * Commits supplied fields only; photo pixels must already have been prepared outside SQL.
   *
   * @param issuer validated caller issuer
   * @param subject validated caller subject
   * @param id original business UUID
   * @param username supplied username, or null to preserve it
   * @param photoAction exact contract intent, or null to preserve the photo
   * @param photo prepared pixels for replacement only
   * @return complete accepted original account
   */
  @Transactional
  public ReadAccount.View change(
      String issuer,
      String subject,
      UUID id,
      String username,
      ProfilePhotoActionEnum photoAction,
      ProfilePhoto photo) {
    String normalized = TextTrimming.trim(username);
    if ((normalized == null && photoAction == null)
        || (normalized != null && !normalized.matches("[A-Za-z0-9._-]{3,32}"))
        || ((photoAction == ProfilePhotoActionEnum.REPLACE) != (photo != null)))
      throw new InvalidProfileChangeException();
    accounts
        .lockById(id)
        .filter(account -> issuer.equals(account.issuer()) && subject.equals(account.subject()))
        .orElseThrow(AccountNotFoundException::new);
    try {
      accounts.changeProfile(id, normalized, photoAction, photo);
    } catch (DataIntegrityViolationException failure) {
      for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
        if (cause instanceof ConstraintViolationException constraint
            && "uk_account_username".equals(constraint.getConstraintName()))
          throw new UsernameUnavailableException();
      }
      throw failure;
    }
    return reads.original(issuer, subject, id);
  }
}
