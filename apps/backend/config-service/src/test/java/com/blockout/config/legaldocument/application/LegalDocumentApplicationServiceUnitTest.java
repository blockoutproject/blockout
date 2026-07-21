package com.blockout.config.legaldocument.application;

import com.blockout.config.legaldocument.application.commands.UpdateLegalDocumentCommand;
import com.blockout.config.legaldocument.application.views.LegalDocumentView;
import com.blockout.config.legaldocument.infrastructure.persistence.entities.LegalDocumentEntity;
import com.blockout.config.legaldocument.infrastructure.persistence.repositories.LegalDocumentRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Verifies legal-document normalization and partial updates.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Legal-document application service")
class LegalDocumentApplicationServiceUnitTest {

    @Mock
    private LegalDocumentRepository repository;
    @InjectMocks
    private LegalDocumentApplicationService service;

    /**
     * Normalizes the route type and preserves omitted document fields.
     */
    @Test
    @DisplayName("normalizes document type and applies supplied fields")
    void normalizesTypeAndAppliesSuppliedFields() {
        LocalDateTime timestamp = LocalDateTime.of(2026, 7, 19, 12, 30);
        LegalDocumentEntity entity = LegalDocumentEntity.builder().id(1L).type("terms").title("Old")
            .version("1").content("content").createdAt(timestamp).lastUpdate(timestamp).build();
        when(repository.findByType("terms")).thenReturn(Optional.of(entity));
        when(repository.saveAndFlush(any(LegalDocumentEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        LegalDocumentView updated = service.update(" TERMS ", new UpdateLegalDocumentCommand("New", null, null));

        assertThat(updated.title()).isEqualTo("New");
        assertThat(updated.version()).isEqualTo("1");
        assertThat(updated.content()).isEqualTo("content");
    }
}
