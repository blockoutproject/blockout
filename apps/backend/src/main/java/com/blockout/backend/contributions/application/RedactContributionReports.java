package com.blockout.backend.contributions.application;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Owns the redaction of private report text during account erasure. */
@Service
@RequiredArgsConstructor
public class RedactContributionReports {
  private final ContributionStore contributions;

  /**
   * Removes the original reporter's private text before the account deletion clears attribution.
   *
   * @param accountId original lifecycle already locked by F05
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public void redact(UUID accountId) {
    contributions.redactReports(accountId);
  }
}
