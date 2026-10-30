package com.blockout.backend.following.application;

import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Reads the public number of existing relations for one exact sporting identity. */
@Service
@RequiredArgsConstructor
public class ReadFollowerCount {
  private final ReadSportingData sporting;
  private final FollowReadStore follows;

  /**
   * Reads an exact team or pool count without resolving the caller's private account. Visibility
   * and count share one read snapshot; hiding never deletes a retained relationship.
   *
   * @param target exact public sporting identity
   * @return existing relation count within the canonical safe-integer range
   * @throws FollowUnavailableTargetException when the target is missing or currently hidden
   * @throws IllegalStateException when storage supplies a count outside the transport bounds
   */
  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public long read(FollowContext.Target target) {
    Kind kind = target.type() == FollowContext.TargetType.TEAM ? Kind.TEAM : Kind.POOL;
    sporting
        .visibility(kind, target.id())
        .filter(SportingVisibility::viewable)
        .orElseThrow(FollowUnavailableTargetException::new);
    long count = follows.count(target);
    if (count < 0 || count > 9007199254740991L)
      throw new IllegalStateException("Follower count exceeds transport bounds");
    return count;
  }
}
