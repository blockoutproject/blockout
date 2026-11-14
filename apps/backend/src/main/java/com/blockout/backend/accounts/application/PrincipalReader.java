package com.blockout.backend.accounts.application;

import com.blockout.backend.accounts.application.exception.AccountUnavailableException;

/** Exact-principal email needed for explicit establishment, never for local reads. */
public interface PrincipalReader {
  /**
   * Reads email for the exact validated principal outside SQL; never searches or links by email.
   * Names, photos and secondary profile payloads are deliberately excluded.
   *
   * @param issuer validated environment issuer
   * @param subject exact validated principal identifier
   * @return usable provider email, or null after a successful read without usable email
   * @throws AccountUnavailableException when the required provider cannot be read safely
   */
  String readEmail(String issuer, String subject);
}
