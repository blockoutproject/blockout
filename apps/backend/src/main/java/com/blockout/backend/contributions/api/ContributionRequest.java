package com.blockout.backend.contributions.api;

import com.blockout.backend.access.application.CurrentPermissions;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.accounts.api.CurrentAccount;
import com.blockout.backend.contributions.application.ContributionContext;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

/** Binds admitted mobile requests to existing F05/F12 owners without a second session or grant. */
@Component
@RequiredArgsConstructor
public class ContributionRequest {
  private final CurrentAccount accounts;
  private final CurrentPermissions permissions;

  /**
   * Resolves current local identity and the single complete stream moderation capability. Shared
   * security and F12 admission precede this boundary; no profile is established here.
   *
   * @return detached context for this request; never a durable authorization token
   * @throws AccessDeniedException if a usable original mobile account cannot be resolved
   */
  public ContributionContext current() {
    UUID accountId = accounts.id();
    return new ContributionContext(
        accountId, permissions.forAccount(accountId).contains(Permission.MODERATE_STREAM_LINKS));
  }
}
