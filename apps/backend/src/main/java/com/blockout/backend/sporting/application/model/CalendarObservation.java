package com.blockout.backend.sporting.application.model;

import com.blockout.backend.generated.ingestion.model.ContextSlotKindEnum;
import java.net.URI;
import java.util.List;

/** Qualified envelope; source failures remain distinct from recognized non-match context. */
public record CalendarObservation(
    MatchObservation.Context context,
    boolean complete,
    List<Match> matches,
    List<Slot> contextSlots,
    List<Failure> failures) {
  /** Detaches submitted collections before independently committed processing. */
  public CalendarObservation {
    matches = List.copyOf(matches);
    contextSlots = List.copyOf(contextSlots);
    failures = List.copyOf(failures);
  }

  /** One attributable native encounter; reference is scoped to its addressed pool. */
  public record Match(
      String nativeMatchReference,
      TeamCandidate home,
      TeamCandidate away,
      MatchObservation.Facts facts,
      URI detailUrl) {}

  /** Recognized bye or future place, never a participant identity. */
  public record Slot(String sourceReference, ContextSlotKindEnum kind) {}

  /** Safe acquisition diagnostic; it always prevents absence finalization. */
  public record Failure(String sourceReference, URI reasonType) {}
}
