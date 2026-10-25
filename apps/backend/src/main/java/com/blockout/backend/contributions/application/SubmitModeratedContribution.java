package com.blockout.backend.contributions.application;

import com.blockout.backend.accounts.application.AccountAccess;
import java.net.URI;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Coordinates accepted moderator publication with current attribution read after its local commit.
 */
@Service
@RequiredArgsConstructor
public class SubmitModeratedContribution {
  private final SubmitContribution submissions;
  private final AccountAccess accounts;

  /**
   * Publishes through the locked command, then resolves current attribution independently. A later
   * rename or erasure may change the displayed name; a failed read never repeats publication.
   *
   * @param accountId original admitted moderator, checked again under the command's account lock
   * @param matchId exact sporting match
   * @param revision viewed contribution revision
   * @param address explicit locally recognized literal, never fetched
   * @return accepted contribution with its current post-commit attribution, possibly absent
   * @throws ContributionRejectedException when the locked command rejects the explicit intent
   * @throws org.springframework.security.access.AccessDeniedException when the current grant is
   *     absent
   */
  @Transactional(propagation = Propagation.NEVER)
  public Result submit(UUID accountId, UUID matchId, String revision, URI address) {
    SubmitContribution.Outcome contribution =
        submissions.submit(accountId, matchId, revision, address, true);
    return new Result(contribution, accounts.displayName(accountId));
  }

  /**
   * Committed publication outcome and independently current attribution for administrative
   * presentation.
   *
   * @param contribution accepted local command outcome, never a historical command receipt
   * @param displayName current original-account name, or null after erasure
   */
  public record Result(SubmitContribution.Outcome contribution, String displayName) {}
}
