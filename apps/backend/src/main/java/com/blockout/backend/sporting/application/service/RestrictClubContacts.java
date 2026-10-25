package com.blockout.backend.sporting.application.service;

import com.blockout.backend.sporting.application.SportingProjectionChanges.Kind;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactField;
import com.blockout.backend.sporting.application.model.SportingPresentation.ContactValue;
import com.blockout.backend.sporting.application.model.SportingPresentation.Contacts;
import com.blockout.backend.sporting.application.port.SportingStore;
import java.util.EnumMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Applies the explicitly authorized private F11 restriction procedure; ordinary HTTP callers cannot
 * lift it.
 */
@Service
@RequiredArgsConstructor
public class RestrictClubContacts {
  private final SportingStore store;

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
}
