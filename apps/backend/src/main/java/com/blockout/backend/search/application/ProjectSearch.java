package com.blockout.backend.search.application;

import com.blockout.backend.sporting.application.SportingProjectionChanges.Scope;
import com.blockout.backend.sporting.application.model.SportingPublicInput;
import com.blockout.backend.sporting.application.model.SportingVisibility.Kind;
import com.blockout.backend.sporting.application.service.ReadSportingData;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Gatherers;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Serial projection orchestration forbids an enclosing SQL transaction; owner reads finish before
 * external writes.
 */
@Service
@Transactional(propagation = Propagation.NEVER)
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(
    prefix = "blockout.search",
    name = "enabled",
    havingValue = "true")
@RequiredArgsConstructor
public class ProjectSearch {
  private final ReadSportingData sporting;
  private final SearchProjectionWriter writer;

  /**
   * Rereads affected scopes when queued work executes, including now-hidden identities.
   *
   * @param scopes immutable after-commit owner identities
   */
  public void update(Set<Scope> scopes) {
    Set<Scope> dependents = sporting.projectionDependents(scopes);
    for (Kind kind : List.of(Kind.CLUB, Kind.TEAM, Kind.POOL)) {
      List<UUID> ids =
          dependents.stream()
              .filter(scope -> scope.kind().name().equals(kind.name()))
              .map(Scope::id)
              .toList();
      ids.stream()
          .gather(Gatherers.windowFixed(200))
          .forEach(
              window -> {
                Set<UUID> batch = new LinkedHashSet<>(window);
                List<SearchDocuments> documents =
                    sporting.publicInputs(kind, batch).stream().map(SearchDocuments::from).toList();
                writer.update(kind, batch, documents);
              });
    }
  }

  /**
   * Rebuilds all resource generations from bounded current reads, then publishes them together.
   * Cleanup follows only a confirmed publication; an uncertain switch is never retried or undone
   * here.
   */
  public void rebuild() {
    Map<Kind, String> generation = writer.createGeneration();
    for (Kind kind : List.of(Kind.CLUB, Kind.TEAM, Kind.POOL)) {
      for (int page = 0; ; page++) {
        List<SportingPublicInput> batch = sporting.projectionInputs(kind, page, 200);
        if (batch.isEmpty()) break;
        writer.write(generation.get(kind), batch.stream().map(SearchDocuments::from).toList());
      }
    }
    writer.publish(generation);
    // An old alias read cannot prove that a timed-out switch is no longer in flight.
    // Only a confirmed publication permits cleanup; failed temporaries wait for the next full run.
    writer.cleanup();
  }
}
