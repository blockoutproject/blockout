package com.blockout.backend.following.application;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Resolves the current personal season choices without transferring follow or sporting ownership.
 */
@Service
@RequiredArgsConstructor
public class ReadFollowOptions {
  private final AccountAccess accounts;
  private final FollowReadStore store;

  /**
   * Reads choices and their default from one original-account snapshot.
   *
   * @param accountId admitted original usable account
   * @return immutable current choices and the newest followed season, otherwise newest catalog
   *     season
   * @throws AccountNotFoundException if that original lifecycle has disappeared
   */
  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public Options read(UUID accountId) {
    if (!accounts.exists(accountId)) throw new AccountNotFoundException();
    List<FollowReadStore.SeasonChoice> choices = store.seasons(accountId);
    UUID proposed =
        choices.stream()
            .filter(FollowReadStore.SeasonChoice::followed)
            .map(FollowReadStore.SeasonChoice::id)
            .findFirst()
            .orElse(choices.isEmpty() ? null : choices.getFirst().id());
    return new Options(
        choices.stream()
            .map(choice -> new SeasonView(choice.id(), choice.startYear(), choice.label()))
            .toList(),
        proposed);
  }

  /**
   * Detached options; a missing default means All seasons, never a fabricated sporting identity.
   *
   * @param seasons distinct eligible choices in descending start-year/ascending UUID order
   * @param defaultSeasonId newest followed choice, otherwise newest catalog choice, or null when
   *     empty
   */
  public record Options(List<SeasonView> seasons, UUID defaultSeasonId) {
    /**
     * Detaches the collection so consumers cannot mutate the read result.
     *
     * @param seasons current ordered choices
     * @param defaultSeasonId ordinary proposed choice, or null when absent
     */
    public Options {
      seasons = List.copyOf(seasons);
    }
  }
}
