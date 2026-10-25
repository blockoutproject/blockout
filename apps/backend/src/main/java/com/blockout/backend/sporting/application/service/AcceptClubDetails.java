package com.blockout.backend.sporting.application.service;

import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Kind;
import com.blockout.backend.sporting.application.model.ObservationOrder;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.SportingPresentation.ClubObservation;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactField;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactValue;
import com.blockout.backend.sporting.application.model.SportingPresentation.Contacts;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.net.URI;
import java.util.EnumMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Accepts ordered club source observations while preserving manual modes and privacy restrictions.
 */
@Service
@RequiredArgsConstructor
public class AcceptClubDetails {
  private final SportingStore store;
  private final com.blockout.backend.collection.application.service.CollectionCycleAccess
      cycleAccess;
  private final com.blockout.backend.collection.application.service.ReadCollectionWork
      collectionWork;
  private final ClubContactValues values;

  /**
   * Emits only safe identity and outcome, never submitted contacts.
   *
   * @param reference exact native club identity
   * @param clubId stable current organization
   * @param status actual acceptance outcome
   * @return synchronous safe result
   */
  private ObservationOutcome outcome(String reference, UUID clubId, ObservationOutcomeEnum status) {
    return new ObservationOutcome(reference, status, clubId, null, null, null);
  }

  /**
   * Accepts current source proposals while preserving each manual/hidden mode and restriction.
   * Invalid individual values preserve their usable prior source; an unavailable page has no call.
   *
   * @param clubId exact admitted club-sheet target
   * @param observation qualified source facts and native presence semantics
   * @return source-scope accepted, unchanged or stale outcome; a safe unprocessable-content reason
   *     marks invalid secondary proposals retained as prior values, without disclosing those values
   */
  @Transactional
  public ObservationOutcome accept(UUID clubId, ClubObservation observation) {
    cycleAccess.requireTarget(
        observation.context().cycleId(), clubId, CollectionTargetKindEnum.CLUB_SHEET);
    store.lockPresentation(Kind.CLUB, clubId);
    ObservationOrder order =
        new ObservationOrder(
            collectionWork.get(observation.context().cycleId()).cycleOrder(),
            observation.context().readOrdinal());
    Contacts current = store.clubContacts(clubId);
    String reference = store.club(clubId).orElseThrow().reference();
    if (current.order() != null && order.compareTo(current.order()) <= 0)
      return outcome(
          reference,
          clubId,
          order.compareTo(current.order()) < 0
              ? ObservationOutcomeEnum.STALE
              : ObservationOutcomeEnum.UNCHANGED);
    Map<ContactField, ContactValue> fields = new EnumMap<>(current.fields());
    boolean rejectedFields = false;
    for (Map.Entry<ContactField, JsonNullable<String>> entry : observation.fields().entrySet()) {
      ContactValue previous = fields.get(entry.getKey());
      if (previous.restricted() || !entry.getValue().isPresent()) continue;
      String proposed = entry.getValue().get();
      if (proposed == null || values.valid(entry.getKey(), proposed))
        fields.put(
            entry.getKey(),
            new ContactValue(proposed, previous.manualValue(), previous.mode(), false));
      else rejectedFields = true;
    }
    String name =
        observation.sourceName() == null || observation.sourceName().isBlank()
            ? null
            : observation.sourceName();
    String previousName = store.club(clubId).orElseThrow().sourceName();
    store.saveClubContacts(
        new Contacts(
            clubId,
            current.revision(),
            fields,
            order,
            observation.context().observedAt(),
            observation.context().providerPublishedAt()),
        name);
    boolean changed =
        !fields.equals(current.fields()) || name != null && !name.equals(previousName);
    return new ObservationOutcome(
        reference,
        changed ? ObservationOutcomeEnum.ACCEPTED : ObservationOutcomeEnum.UNCHANGED,
        clubId,
        rejectedFields ? URI.create("urn:blockout:problem:unprocessable-content") : null,
        null,
        null);
  }
}
