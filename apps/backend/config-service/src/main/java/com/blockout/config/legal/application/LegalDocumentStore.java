package com.blockout.config.legal.application;

import java.util.Optional;

public interface LegalDocumentStore {

    Optional<LegalDocumentSnapshot> findByType(String type);

    Optional<LegalDocumentChange> update(String type, UpdateLegalDocumentCommand command);
}
