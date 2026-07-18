package com.blockout.notifications.inbox.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import com.blockout.notifications.inbox.application.NotificationInboxSnapshot;
import com.blockout.notifications.inbox.application.CreateInboxNotificationCommand;
import java.lang.reflect.Proxy;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Slice;
import org.springframework.data.domain.SliceImpl;
import org.springframework.data.domain.Sort;

class JpaNotificationInboxStoreTest {

    private final AtomicReference<String> repositoryCall = new AtomicReference<>();
    private final AtomicReference<Slice<NotificationInboxEntity>> repositoryResult = new AtomicReference<>();
    private final AtomicReference<NotificationInboxSnapshot> mappedSnapshot = new AtomicReference<>();
    private JpaNotificationInboxStore store;

    @BeforeEach
    void setUp() {
        NotificationInboxRepository repository = (NotificationInboxRepository) Proxy.newProxyInstance(
                NotificationInboxRepository.class.getClassLoader(),
                new Class<?>[] {NotificationInboxRepository.class},
                (proxy, method, arguments) -> {
                    if (method.getName().startsWith("findByUserIdOrderByCreatedAtDesc")) {
                        repositoryCall.set("%s:%s:%s".formatted(
                                method.getName(), arguments[0], arguments[1]));
                        return repositoryResult.get();
                    }
                    throw new UnsupportedOperationException(method.getName());
                });
        NotificationInboxPersistenceMapper mapper = new NotificationInboxPersistenceMapper() {
            @Override
            public NotificationInboxSnapshot toSnapshot(NotificationInboxEntity entity) {
                return mappedSnapshot.get();
            }

            @Override
            public NotificationInboxEntity toEntity(CreateInboxNotificationCommand command) {
                throw new UnsupportedOperationException("write mapping is outside this read-store test");
            }
        };
        store = new JpaNotificationInboxStore(repository, mapper);
    }

    @Test
    void canonicalPagesUseTheRepositoryOwnedStableCreatedAtAndIdOrdering() {
        NotificationInboxEntity entity = new NotificationInboxEntity();
        NotificationInboxSnapshot snapshot = new NotificationInboxSnapshot(
                1L, 2L, null, "title", "body", null, null, null, null, null,
                false, false, java.time.Instant.EPOCH, null, null);
        mappedSnapshot.set(snapshot);
        PageRequest request = PageRequest.of(3, 20);
        repositoryResult.set(new SliceImpl<>(List.of(entity), request, true));

        var result = store.findStable(7L, 3, 20);

        assertThat(result.items()).containsExactly(snapshot);
        assertThat(result.hasNext()).isTrue();
        assertThat(repositoryCall.get()).isEqualTo(
                "findByUserIdOrderByCreatedAtDescIdDesc:7:" + request);
    }

    @Test
    void legacyPagesRetainTheHistoricalCreatedAtOnlySort() {
        PageRequest request = PageRequest.of(1, 10, Sort.by(Sort.Direction.DESC, "createdAt"));
        repositoryResult.set(new SliceImpl<>(List.of(), request, false));

        var result = store.findLegacy(8L, 1, 10);

        assertThat(result.items()).isEmpty();
        assertThat(result.hasNext()).isFalse();
        assertThat(repositoryCall.get()).isEqualTo(
                "findByUserIdOrderByCreatedAtDesc:8:" + request);
    }
}
