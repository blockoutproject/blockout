package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import java.time.Instant;

/** Exact-principal provider evidence needed for explicit establishment, never for local reads. */
public interface PrincipalReader {
  /**
   * Reads the exact validated principal outside SQL; never searches or links by email.
   *
   * @param issuer validated environment issuer
   * @param subject exact validated principal identifier
   * @return minimal available evidence, with unknown email/date represented by null
   * @throws AccountUnavailableException when the required provider cannot be read safely
   */
  Evidence read(String issuer, String subject);

  /**
   * Minimal evidence; names, photos and secondary profile payloads are deliberately excluded.
   *
   * @param email usable provider email, or null
   * @param createdAt trustworthy principal creation instant, or null
   */
  record Evidence(String email, Instant createdAt) {}
}
