package com.blockout.backend.contributions.application;

import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.service.SportingReadService;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Supplies only the currently permitted active contribution; no private moderation data. */
@Service
@RequiredArgsConstructor
public class ReadPublicContribution {
  private final ContributionStore store;
  private final SportingReadService sporting;

  /**
   * Reads availability; result composition callers retain the shared F02 match lock.
   *
   * @param matchId current sporting identity
   * @return exact contributed identity/address when publicly permitted
   */
  @Transactional(readOnly = true)
  public Optional<Link> read(UUID matchId) {
    if (sporting.visibility(Kind.MATCH, matchId).filter(SportingVisibility::viewable).isEmpty())
      return Optional.empty();
    return store.active(matchId).map(version -> new Link(version.id(), version.address().value()));
  }

  /**
   * Public pair owned by one active version, without historical addresses or attribution.
   *
   * @param contributionId exact active version identity
   * @param address current authorized literal address
   */
  public record Link(UUID contributionId, String address) {}
}
