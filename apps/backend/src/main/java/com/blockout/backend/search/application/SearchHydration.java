package com.blockout.backend.search.application;

import com.blockout.backend.sporting.application.ReadSportingResources;
import com.blockout.backend.sporting.application.model.SportingPublicInput;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.service.SportingReadService;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

/** Short SQL-only batch hydration through F02/F03 application APIs. */
@Service
@RequiredArgsConstructor
public class SearchHydration {
  private final SportingReadService owners;
  private final ReadSportingResources resources;

  /**
   * Rechecks current visibility, exact filters and indexed/current city before public summaries.
   *
   * @param context current selection
   * @param candidates at most 200 native identities with indexed city
   * @return current summaries by identity, omitting stale or forbidden candidates
   */
  @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
  public Map<UUID, SearchPage.Summary> current(
      SearchContext context, List<SearchEngine.Candidate> candidates) {
    Set<UUID> ids = candidates.stream().map(c -> c.position().id()).collect(Collectors.toSet());
    Map<UUID, String> cities = new HashMap<>();
    for (SearchEngine.Candidate candidate : candidates)
      cities.put(candidate.position().id(), candidate.city());
    Map<UUID, SearchPage.Summary> result = new HashMap<>();
    for (SportingPublicInput input :
        owners.publicInputs(Kind.valueOf(context.resource().name()), ids)) {
      if (!Objects.equals(cities.get(input.id()), input.city()) || !matches(context, input))
        continue;
      SearchPage.Summary summary =
          switch (context.resource()) {
            case CLUB ->
                new SearchPage.Summary(
                    new SearchPage.Club(resources.club(input.id()).club(), input.city()),
                    null,
                    null);
            case TEAM -> new SearchPage.Summary(null, resources.team(input.id()).team(), null);
            case POOL -> new SearchPage.Summary(null, null, resources.pool(input.id()).pool());
          };
      result.put(input.id(), summary);
    }
    return Map.copyOf(result);
  }

  /**
   * Applies exact current sporting filters independently of the stale engine projection.
   *
   * @param context requested optional filters
   * @param input current eligible owner values; unknown classification cannot satisfy a filter
   * @return whether every selected filter still matches
   */
  private boolean matches(SearchContext context, SportingPublicInput input) {
    return (context.seasonId() == null || context.seasonId().equals(input.seasonId()))
        && (context.divisionId() == null
            || input.classification() != null
                && context.divisionId().equals(input.classification().divisionId()))
        && (context.format() == null
            || input.classification() != null
                && input.classification().format() != null
                && context.format().getValue().equals(input.classification().format().getValue()))
        && (context.gender() == null
            || input.classification() != null
                && input.classification().gender() != null
                && context.gender().getValue().equals(input.classification().gender().getValue()));
  }
}
