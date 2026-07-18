package com.blockout.config.legal.persistence;

import com.blockout.config.legal.application.LegalDocumentChange;
import com.blockout.config.legal.application.LegalDocumentSnapshot;
import com.blockout.config.legal.application.LegalDocumentStore;
import com.blockout.config.legal.application.UpdateLegalDocumentCommand;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JpaLegalDocumentStore implements LegalDocumentStore {

    private final LegalDocumentRepository repository;
    private final LegalDocumentPersistenceMapper mapper;

    @Override
    public Optional<LegalDocumentSnapshot> findByType(String type) {
        return repository.findByType(type).map(mapper::toSnapshot);
    }

    @Override
    public Optional<LegalDocumentChange> update(String type, UpdateLegalDocumentCommand command) {
        return repository.findByType(type).map(entity -> update(entity, command));
    }

    private LegalDocumentChange update(LegalDocumentEntity entity, UpdateLegalDocumentCommand command) {
        LegalDocumentSnapshot before = mapper.toSnapshot(entity);
        mapper.apply(command, entity);
        LegalDocumentSnapshot after = mapper.toSnapshot(repository.save(entity));
        return new LegalDocumentChange(before, after);
    }
}
