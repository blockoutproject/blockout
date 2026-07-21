package com.blockout.config.scraperstatus.application;

import com.blockout.config.scraperstatus.application.models.ScraperName;
import com.blockout.config.scraperstatus.application.views.ScraperStatusView;
import com.blockout.config.scraperstatus.infrastructure.persistence.entities.ScraperStatusEntity;
import com.blockout.config.scraperstatus.infrastructure.persistence.repositories.ScraperStatusRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Verifies scraper-status creation and update behavior.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Scraper-status application service")
class ScraperStatusApplicationServiceUnitTest {

    @Mock
    private ScraperStatusRepository repository;
    @InjectMocks
    private ScraperStatusApplicationService service;

    /**
     * Creates a missing scraper status with the requested state.
     */
    @Test
    @DisplayName("creates a missing scraper status")
    void createsMissingScraperStatus() {
        when(repository.findByName(ScraperName.SCRAPER)).thenReturn(Optional.empty());
        when(repository.saveAndFlush(any(ScraperStatusEntity.class))).thenAnswer(invocation -> {
            ScraperStatusEntity entity = invocation.getArgument(0);
            entity.setId(1L);
            return entity;
        });

        ScraperStatusView updated = service.updateStatus(ScraperName.SCRAPER, true);

        assertThat(updated.id()).isEqualTo(1L);
        assertThat(updated.enabled()).isTrue();
    }
}
