package com.blockout.workersearch.events;

import com.blockout.workersearch.models.docs.LifecycleEventReceiptDoc;
import com.blockout.workersearch.repositories.LifecycleEventReceiptRepository;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class ElasticsearchLifecycleEventReceiptStore implements LifecycleEventReceiptStore {

    private final LifecycleEventReceiptRepository repository;

    @Override
    public boolean exists(UUID eventId) {
        return repository.existsById(eventId.toString());
    }

    @Override
    public void record(UUID eventId, String eventType, String wireVersion) {
        repository.save(LifecycleEventReceiptDoc.builder()
                .eventId(eventId.toString())
                .eventType(eventType)
                .wireVersion(wireVersion)
                .processedAt(Instant.now())
                .build());
    }
}
