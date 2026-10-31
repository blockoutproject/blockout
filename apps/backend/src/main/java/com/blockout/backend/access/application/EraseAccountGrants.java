package com.blockout.backend.access.application;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/** Narrow access participant in the original-account erasure transaction; takes no domain roots. */
@Service
@RequiredArgsConstructor
public class EraseAccountGrants {
  private final PermissionStore permissions;

  /**
   * Clears only original-owned personal associations while retaining protected business facts.
   *
   * @param accountId original lifecycle already locked by F05
   */
  @Transactional(propagation = Propagation.MANDATORY)
  public void erase(UUID accountId) {
    permissions.erase(accountId);
  }
}
