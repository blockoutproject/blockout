package com.blockout.backend.sporting.application.service;

import com.blockout.backend.access.application.ActionAuthorization;
import com.blockout.backend.access.domain.Permission;
import com.blockout.backend.generated.mobile.model.ContactModeEnum;
import com.blockout.backend.sporting.application.SportingProjectionChanges.Kind;
import com.blockout.backend.sporting.application.exception.SportingConflictException;
import com.blockout.backend.sporting.application.exception.SportingValidationException;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactEdit;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactField;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactValue;
import com.blockout.backend.sporting.application.model.SportingPresentation.Contacts;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Complete operator contact corrections preserve current source values and private F11
 * restrictions.
 */
@Service
@RequiredArgsConstructor
public class ChangeClubContacts {
  private final SportingStore store;
  private final com.blockout.backend.access.application.CurrentPermissions permissions;
  private final ActionAuthorization authorization;
  private final ClubContactValues values;

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
    permissions.requireForRead(accountId, Permission.MANAGE_SPORTING_PRESENTATION);
    if (edits.isEmpty()) throw new SportingValidationException();
    store.lockPresentation(Kind.CLUB, clubId);
    authorization.require(accountId, Permission.MANAGE_SPORTING_PRESENTATION);
    Contacts current = store.clubContacts(clubId);
    SportingEditRevision.require(revision, Long.toString(current.revision()));
    Map<ContactField, ContactValue> fields = new EnumMap<>(current.fields());
    for (Map.Entry<ContactField, ContactEdit> entry : edits.entrySet()) {
      ContactEdit edit = entry.getValue();
      ContactValue previous = fields.get(entry.getKey());
      if (edit.mode() == ContactModeEnum.MANUAL) {
        if (previous.restricted()) throw new SportingConflictException("conflict", List.of());
        if (!values.valid(entry.getKey(), edit.value())) throw new SportingValidationException();
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
}
