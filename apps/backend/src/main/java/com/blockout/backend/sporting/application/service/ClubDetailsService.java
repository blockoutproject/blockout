package com.blockout.backend.sporting.application.service;

import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.collection.application.service.CollectionCycleService;
import com.blockout.backend.generated.ingestion.model.CollectionTargetKindEnum;
import com.blockout.backend.generated.ingestion.model.ObservationOutcomeEnum;
import com.blockout.backend.generated.mobile.model.ContactModeEnum;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Kind;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.exception.SportingValidationException;
import com.blockout.backend.sporting.application.model.ObservationOrder;
import com.blockout.backend.sporting.application.model.ObservationOutcome;
import com.blockout.backend.sporting.application.model.SportingPresentation.ClubObservation;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactEdit;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactField;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactValue;
import com.blockout.backend.sporting.application.model.SportingPresentation.Contacts;
import com.blockout.backend.sporting.application.port.SportingStore;
import jakarta.validation.Validator;
import jakarta.validation.constraints.Email;
import java.net.URI;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Source details, complete contact corrections and the trusted manual F11 restriction operation.
 */
@Service
@RequiredArgsConstructor
public class ClubDetailsService {
  private final SportingStore store;
  private final CollectionCycleService cycles;
  private final SportingPresentationService presentation;
  private final ActionAuthorization authorization;
  private final Validator validator;

  /**
   * Reads only currently permitted contact values and independent management modes.
   *
   * @param accountId original account with the contact-correction grant
   * @param clubId established organization
   * @return current editor state without previous personal values
   */
  @Transactional(readOnly = true)
  public Contacts get(UUID accountId, UUID clubId) {
    presentation.requireGrant(accountId);
    return store.clubContacts(clubId);
  }

  /**
   * Applies every supplied field or none, serializing with collection and rights decisions.
   *
   * @param accountId original operator, rechecked under the account lock after the club lock
   * @param clubId stable club
   * @param revision contacts revision read before editing
   * @param edits nonempty supplied field modes, with omission represented by an absent map entry
   * @return current contact state; matching no-ops preserve its revision
   */
  @Transactional
  public Contacts correct(
      UUID accountId, UUID clubId, String revision, Map<ContactField, ContactEdit> edits) {
    presentation.requireGrant(accountId);
    if (edits.isEmpty()) throw new SportingValidationException();
    store.lockPresentation(Kind.CLUB, clubId);
    authorization.require(accountId, Permission.MANAGE_SPORTING_PRESENTATION);
    Contacts current = store.clubContacts(clubId);
    if (!Long.toString(current.revision()).equals(revision))
      throw new SportingConflictException("stale-revision", List.of());
    Map<ContactField, ContactValue> fields = new EnumMap<>(current.fields());
    for (Map.Entry<ContactField, ContactEdit> entry : edits.entrySet()) {
      ContactEdit edit = entry.getValue();
      ContactValue previous = fields.get(entry.getKey());
      if (edit.mode() == ContactModeEnum.MANUAL) {
        if (previous.restricted()) throw new SportingConflictException("conflict", List.of());
        if (!valid(entry.getKey(), edit.value())) throw new SportingValidationException();
      } else if (edit.value() != null) throw new SportingValidationException();
      fields.put(
          entry.getKey(),
          new ContactValue(
              previous.sourceValue(),
              edit.mode() == ContactModeEnum.MANUAL ? edit.value() : null,
              edit.mode(),
              previous.restricted()));
    }
    store.saveClubContacts(
        new Contacts(
            clubId,
            current.revision(),
            fields,
            current.order(),
            current.observedAt(),
            current.providerPublishedAt()),
        null);
    return store.clubContacts(clubId);
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
    cycles.requireTarget(
        observation.context().cycleId(), clubId, CollectionTargetKindEnum.CLUB_SHEET);
    store.lockPresentation(Kind.CLUB, clubId);
    ObservationOrder order =
        new ObservationOrder(
            cycles.get(observation.context().cycleId()).cycleOrder(),
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
      if (proposed == null || valid(entry.getKey(), proposed))
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
            observation.context().observedAt().toInstant(),
            observation.context().providerPublishedAt() == null
                ? null
                : observation.context().providerPublishedAt().toInstant()),
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

  /**
   * Applies an already authorized manual rights decision; no ordinary HTTP operation invokes it.
   * The caller must use F11's trusted manual procedure. No operation here lifts a restriction.
   *
   * @param clubId exact organization selected by the authorized rights decision
   * @param restrictedFields affected fields only; empty is a no-op
   */
  @Transactional
  public void restrict(UUID clubId, Set<ContactField> restrictedFields) {
    store.lockPresentation(Kind.CLUB, clubId);
    Contacts current = store.clubContacts(clubId);
    Map<ContactField, ContactValue> fields = new EnumMap<>(current.fields());
    for (ContactField field : restrictedFields)
      fields.put(field, new ContactValue(null, null, fields.get(field).mode(), true));
    store.saveClubContacts(
        new Contacts(
            clubId,
            current.revision(),
            fields,
            current.order(),
            current.observedAt(),
            current.providerPublishedAt()),
        null);
  }

  /**
   * Validates current field meaning without imposing a speculative phone/postcode format.
   *
   * @param field independent contact purpose
   * @param value proposed non-null value
   * @return whether this source/manual value is usable for its field
   */
  private boolean valid(ContactField field, String value) {
    if (value == null || value.isBlank() || value.codePoints().anyMatch(Character::isISOControl))
      return false;
    if (field == ContactField.EMAIL) return validator.validate(new ContactEmail(value)).isEmpty();
    if (field != ContactField.WEBSITE) return true;
    try {
      URI uri = URI.create(value);
      return ("https".equalsIgnoreCase(uri.getScheme()) || "http".equalsIgnoreCase(uri.getScheme()))
          && uri.getHost() != null
          && uri.getUserInfo() == null;
    } catch (IllegalArgumentException invalid) {
      return false;
    }
  }

  /** Uses standard Bean Validation for the field-dependent email constraint. */
  private record ContactEmail(@Email String value) {}

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
}
