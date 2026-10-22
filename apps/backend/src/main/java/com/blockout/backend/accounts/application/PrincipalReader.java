package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.application.exception.AccountUnavailableException;
import java.time.Instant;
import java.util.List;

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
   * @param identities existing connection evidence; does not define another business identity
   */
  record Evidence(String email, Instant createdAt, List<Identity> identities) {}

  /**
   * Existing linked-connection evidence, without copying the secondary user's personal profile.
   *
   * @param provider provider family
   * @param connection exact Auth0 connection
   */
  record Identity(String provider, String connection) {}
}
