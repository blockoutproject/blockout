package com.blockout.backend.following.application;

import com.blockout.backend.accounts.application.AccountAccess;
import com.blockout.backend.accounts.application.exception.AccountNotFoundException;
import com.blockout.backend.following.application.FollowContext.TargetType;
import com.blockout.backend.following.application.FollowReadStore.TargetPage;
import com.blockout.backend.sporting.application.ConsultationViews.PoolSummary;
import com.blockout.backend.sporting.application.ConsultationViews.TeamSummary;
import com.blockout.backend.sporting.application.ReadSportingResources;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Reads current personal team and pool pages using their sporting presentation owner. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class ReadFollowLists {
  /** Canonical size shared with native selection, without an exposed total. */
  public static final int PAGE_SIZE = 20;

  /** Greatest page whose twenty-item native JPA offset is representable as an int. */
  public static final long MAX_PAGE = 107374182L;

  private final AccountAccess accounts;
  private final FollowReadStore follows;
  private final ReadSportingResources sporting;

  /**
   * Reads current team summaries in the database selection's French name/UUID order.
   *
   * @param accountId admitted original usable account
   * @param seasonId optional canonical season, or null for all seasons
   * @param page zero-based page between zero and {@link #MAX_PAGE}
   * @return at most twenty current summaries with an optional continuation, never a total
   * @throws AccountNotFoundException if the original lifecycle disappeared
   * @throws FollowUnavailableTargetException if the selected season is unavailable
   * @throws FollowPageOutOfRangeException if the requested page or continuation is unrepresentable
   */
  public Teams teams(UUID accountId, UUID seasonId, long page) {
    TargetPage selected = select(accountId, TargetType.TEAM, seasonId, page);
    Long nextPage = continuation(selected, page);
    Map<UUID, TeamSummary> summaries =
        selected.ids().isEmpty() ? Map.of() : sporting.teamSummaries(Set.copyOf(selected.ids()));
    return new Teams(selected.ids().stream().map(summaries::get).toList(), nextPage);
  }

  /**
   * Reads current pool summaries without hydrating each sporting target separately.
   *
   * @param accountId admitted original usable account
   * @param seasonId optional canonical season, or null for all seasons
   * @param page zero-based page between zero and {@link #MAX_PAGE}
   * @return at most twenty current summaries with an optional continuation, never a total
   * @throws AccountNotFoundException if the original lifecycle disappeared
   * @throws FollowUnavailableTargetException if the selected season is unavailable
   * @throws FollowPageOutOfRangeException if the requested page or continuation is unrepresentable
   */
  public Pools pools(UUID accountId, UUID seasonId, long page) {
    TargetPage selected = select(accountId, TargetType.POOL, seasonId, page);
    Long nextPage = continuation(selected, page);
    Map<UUID, PoolSummary> summaries =
        selected.ids().isEmpty() ? Map.of() : sporting.poolSummaries(Set.copyOf(selected.ids()));
    return new Pools(selected.ids().stream().map(summaries::get).toList(), nextPage);
  }

  /**
   * Admits the original account, season and page before native offset conversion and selection.
   *
   * @param accountId original account whose existence is checked in this transaction
   * @param type exact relationship kind
   * @param seasonId optional currently available sporting season
   * @param page requested zero-based page
   * @return ordered current identities and a lookahead indication
   */
  private TargetPage select(UUID accountId, TargetType type, UUID seasonId, long page) {
    if (page < 0 || page > MAX_PAGE) throw new FollowPageOutOfRangeException();
    if (!accounts.exists(accountId)) throw new AccountNotFoundException();
    if (seasonId != null
        && follows.seasons(accountId).stream().noneMatch(choice -> choice.id().equals(seasonId)))
      throw new FollowUnavailableTargetException();
    return follows.targets(accountId, type, seasonId, page);
  }

  /**
   * Rejects overflow explicitly instead of falsely claiming exhaustion at the native limit.
   *
   * @param selected bounded native selection
   * @param page admitted requested page
   * @return next supported page, or null only when the selection has no further row
   */
  private Long continuation(TargetPage selected, long page) {
    if (!selected.hasNext()) return null;
    if (page == MAX_PAGE) throw new FollowPageOutOfRangeException();
    return page + 1;
  }

  /**
   * Current team summaries; no durable snapshot or total is promised across pages.
   *
   * @param items at most twenty current summaries
   * @param nextPage next page, or null only at exhaustion
   */
  public record Teams(List<TeamSummary> items, Long nextPage) {
    /**
     * Detaches the returned summaries while preserving database order.
     *
     * @param items current team summaries
     * @param nextPage next supported page, or null at exhaustion
     */
    public Teams {
      items = List.copyOf(items);
    }
  }

  /**
   * Current pool summaries; no durable snapshot or total is promised across pages.
   *
   * @param items at most twenty current summaries
   * @param nextPage next page, or null only at exhaustion
   */
  public record Pools(List<PoolSummary> items, Long nextPage) {
    /**
     * Detaches the returned summaries while preserving database order.
     *
     * @param items current pool summaries
     * @param nextPage next supported page, or null at exhaustion
     */
    public Pools {
      items = List.copyOf(items);
    }
  }
}
