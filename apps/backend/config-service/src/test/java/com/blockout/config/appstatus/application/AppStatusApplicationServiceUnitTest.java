package com.blockout.config.appstatus.application;

import com.blockout.config.appstatus.application.commands.UpdateAppStatusCommand;
import com.blockout.config.appstatus.application.views.AppStatusView;
import com.blockout.config.appstatus.infrastructure.persistence.entities.AppStatusEntity;
import com.blockout.config.appstatus.infrastructure.persistence.repositories.AppStatusRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Verifies partial app-status updates.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("App-status application service")
class AppStatusApplicationServiceUnitTest {

    @Mock
    private AppStatusRepository repository;
    @InjectMocks
    private AppStatusApplicationService service;

    /**
     * Changes supplied values while preserving omitted values.
     */
    @Test
    @DisplayName("applies only supplied app-status fields")
    void appliesOnlySuppliedFields() {
        AppStatusEntity entity = AppStatusEntity.builder().id(1L).maintenance(false).message("ready")
            .minVersionIos("1.0").lastUpdate(Instant.parse("2026-07-19T10:30:00Z")).build();
        when(repository.findFirstByOrderByIdAsc()).thenReturn(Optional.of(entity));
        when(repository.saveAndFlush(any(AppStatusEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AppStatusView updated = service.updateStatus(new UpdateAppStatusCommand(
            true, null, null, "2.0", null, null, null, null));

        assertThat(updated.maintenance()).isTrue();
        assertThat(updated.message()).isEqualTo("ready");
        assertThat(updated.minVersionIos()).isEqualTo("2.0");
    }
}
