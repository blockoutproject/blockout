package com.blockout.backend.sporting.application;

import com.blockout.backend.sporting.application.ConsultationStore.MatchInput;
import com.blockout.backend.sporting.application.model.SportingPresentation.View;
import com.blockout.backend.sporting.application.model.SportingViews.SeasonView;
import com.blockout.backend.sporting.application.model.SportingVisibility;
import com.blockout.backend.sporting.application.port.SportingReadStore;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Bounded private sporting context; consumers must authorize their own private feature first. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReadPrivateMatches {
  private final ConsultationStore reads;
  private final SportingStore facts;
  private final SportingReadStore visibility;
  private final ConsultationViewMapper mapper;

  /**
   * Projects only existing canonical season labels for an authorized private selection.
   *
   * @param ids retained season identities supplied by the consumer
   * @return newest-first season labels without collection-management permissions
   */
  public List<SeasonView> seasons(Set<UUID> ids) {
    return reads.seasons(ids).values().stream()
        .sorted(
            Comparator.comparing(SeasonView::startYear).reversed().thenComparing(SeasonView::id))
        .toList();
  }

  /**
   * Composes retained matches with F03 primitives without imposing its public dated wrapper.
   *
   * @param ids bounded already authorized private selection
   * @return existing contexts, including hidden/dateless matches, without per-match queries
   */
  public Map<UUID, Context> read(Set<UUID> ids) {
    Map<UUID, MatchInput> inputs = reads.matches(ids);
    Set<UUID> teamIds =
        inputs.values().stream()
            .flatMap(input -> Stream.of(input.homeTeamId(), input.awayTeamId()))
            .collect(Collectors.toSet());
    Map<UUID, View> teams = facts.presentations(SportingProjectionChanges.Kind.TEAM, teamIds);
    Map<UUID, SportingVisibility> restrictions = visibility.matchVisibilities(ids);
    return inputs.values().stream()
        .collect(
            Collectors.toUnmodifiableMap(
                MatchInput::id,
                input ->
                    new Context(
                        input.id(),
                        input.season().id(),
                        mapper.toView(teams.get(input.homeTeamId())),
                        mapper.toView(teams.get(input.awayTeamId())),
                        new ConsultationViews.PoolSummary(
                            mapper.toView(input.pool()),
                            input.season(),
                            classification(input),
                            null,
                            null),
                        input.schedule().localDate() == null ? null : input.schedule(),
                        mapper.toView(input.result(), input.resultObservedAt()),
                        restrictions.get(input.id()).viewable())));
  }

  /**
   * Preserves unknown classification through the required shared context object without inventing a
   * division.
   *
   * @param input retained owner facts, possibly unclassified
   * @return known classification members, or an empty classification object
   */
  private ConsultationViews.Classification classification(MatchInput input) {
    ConsultationViews.Classification value =
        mapper.toView(input.classification(), input.division());
    return value == null ? new ConsultationViews.Classification(null, null, null) : value;
  }

  /** Private retained context; publiclyViewable is informational and authorizes no publication. */
  public record Context(
      UUID id,
      UUID seasonId,
      ConsultationViews.Identity home,
      ConsultationViews.Identity away,
      ConsultationViews.PoolSummary pool,
      ConsultationViews.Schedule schedule,
      ConsultationViews.Result result,
      boolean publiclyViewable) {}
}
