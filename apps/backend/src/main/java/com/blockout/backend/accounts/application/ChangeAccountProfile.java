package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.accounts.application.exception.InvalidProfileChangeException;
import com.blockout.backend.accounts.application.exception.UsernameUnavailableException;
import com.blockout.backend.accounts.domain.AccountUsername;
import com.blockout.backend.generated.mobile.model.ProfilePhotoActionEnum;
import com.blockout.backend.shared.validation.TextTrimming;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Applies supplied profile fields under the original account row lock. */
@Service
@RequiredArgsConstructor
public class ChangeAccountProfile {
  private final AccountStore accounts;
  private final AccountAccess access;
  private final ReadAccount reads;

  /**
   * Commits supplied fields only; accepted photo bytes must pass header recognition outside SQL.
   *
   * @param issuer validated caller issuer
   * @param subject validated caller subject
   * @param id original business UUID
   * @param username supplied username, or null to preserve it
   * @param photoAction exact contract intent, or null to preserve the photo
   * @param photo accepted original image bytes for replacement only
   * @return complete accepted original account
   * @throws InvalidProfileChangeException for invalid supplied fields or photo intent
   * @throws AccountNotFoundException when the original account is absent or belongs to another
   *     owner
   * @throws UsernameUnavailableException when another account holds the supplied username
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
        || (normalized != null && !normalized.matches(AccountUsername.FORMAT))) {
      throw new InvalidProfileChangeException();
    }
    ProfilePhoto.requireConsistentIntent(photoAction, photo != null);
    access.lockOwnedOriginal(issuer, subject, id);
    accounts.changeProfile(id, normalized, photoAction, photo);
    return reads.original(issuer, subject, id);
  }
}
