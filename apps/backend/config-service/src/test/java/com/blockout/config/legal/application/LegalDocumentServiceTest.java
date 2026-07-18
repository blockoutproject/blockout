package com.blockout.config.legal.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.config.legal.persistence.LegalDocumentEntity;
import com.blockout.config.legal.persistence.LegalDocumentPersistenceMapper;
import com.blockout.config.legal.persistence.LegalDocumentRepository;
import com.blockout.config.legal.persistence.JpaLegalDocumentStore;
import java.lang.reflect.Proxy;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class LegalDocumentServiceTest {

    private final LegalDocumentPersistenceMapper mapper = Mappers.getMapper(LegalDocumentPersistenceMapper.class);

    @Test
    void getKeepsTheLegacyExactPathLookup() {
        AtomicReference<String> lookup = new AtomicReference<>();
        LegalDocumentRepository repository = repository(Optional.empty(), lookup);
        LegalDocumentService service = new LegalDocumentService(new JpaLegalDocumentStore(repository, mapper));

        assertThatThrownBy(() -> service.getByType(" Privacy "))
                .isInstanceOf(LegalDocumentNotFoundException.class);

        assertThat(lookup).hasValue(" Privacy ");
    }

    @Test
    void updateNormalizesThePathAndKeepsNullFieldsUnchanged() {
        LocalDateTime createdAt = LocalDateTime.of(2025, 1, 2, 3, 4, 5);
        LocalDateTime lastUpdate = LocalDateTime.of(2025, 6, 7, 8, 9, 10);
        LegalDocumentEntity entity = LegalDocumentEntity.builder()
                .id(7L)
                .type("privacy")
                .title("Privacy")
                .version("1.0")
                .content("# Privacy")
                .createdAt(createdAt)
                .lastUpdate(lastUpdate)
                .build();
        AtomicReference<String> lookup = new AtomicReference<>();
        LegalDocumentRepository repository = repository(Optional.of(entity), lookup);
        LegalDocumentService service = new LegalDocumentService(new JpaLegalDocumentStore(repository, mapper));

        LegalDocumentSnapshot result = service.update(
                " Privacy ",
                new UpdateLegalDocumentCommand(null, "2.0", null));

        assertThat(lookup).hasValue("privacy");
        assertThat(result.id()).isEqualTo(7L);
        assertThat(result.title()).isEqualTo("Privacy");
        assertThat(result.version()).isEqualTo("2.0");
        assertThat(result.content()).isEqualTo("# Privacy");
        assertThat(result.createdAt()).isEqualTo(createdAt);
        assertThat(result.lastUpdate()).isEqualTo(lastUpdate);
    }

    private LegalDocumentRepository repository(
            Optional<LegalDocumentEntity> result, AtomicReference<String> lookup) {
        return (LegalDocumentRepository) Proxy.newProxyInstance(
                LegalDocumentRepository.class.getClassLoader(),
                new Class<?>[] {LegalDocumentRepository.class},
                (proxy, method, arguments) -> switch (method.getName()) {
                    case "findByType" -> {
                        lookup.set((String) arguments[0]);
                        yield result;
                    }
                    case "save" -> arguments[0];
                    default -> throw new UnsupportedOperationException(method.getName());
                });
    }
}
