package com.blockout.backend.contributions.application;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.contributions.domain.ContributionVersion;
import com.blockout.backend.contributions.domain.ContributionVersion.State;
import com.blockout.backend.sporting.application.exception.SportingResourceNotFoundException;
import com.blockout.backend.sporting.application.service.MatchContributionAccess;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reads only original-account reporting state in a coherent private snapshot, never report content.
 */
@Service
@RequiredArgsConstructor
public class ReadOwnReport {
  private final ContributionStore store;
  private final MatchContributionAccess sporting;
  private final AccountAccess accounts;

  /**
   * Existing reporting state remains readable for an inactive exact version on a viewable match.
   *
   * @param reporter original admitted account
   * @param versionId exact retained version
   * @return whether this original account has reported this version
   * @throws AccountNotFoundException when the original lifecycle no longer exists
   * @throws SportingResourceNotFoundException for unknown, unavailable or unreported inactive
   *     targets
   */
  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public boolean read(UUID reporter, UUID versionId) {
    if (!accounts.exists(reporter)) throw new AccountNotFoundException();
    ContributionVersion version =
        store.version(versionId).orElseThrow(SportingResourceNotFoundException::new);
    if (!sporting.read(version.matchId()).viewable()) throw new SportingResourceNotFoundException();
    boolean reported = store.reported(versionId, reporter);
    if (!reported && version.state() != State.ACTIVE) throw new SportingResourceNotFoundException();
    return reported;
  }
}
