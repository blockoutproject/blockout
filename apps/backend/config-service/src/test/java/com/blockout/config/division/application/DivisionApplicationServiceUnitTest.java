package com.blockout.config.division.application;

import com.blockout.config.division.application.commands.DivisionImageCommand;
import com.blockout.config.division.application.commands.UpdateDivisionCommand;
import com.blockout.config.division.application.ports.DivisionImageStorage;
import com.blockout.config.division.application.views.DivisionView;
import com.blockout.config.division.infrastructure.persistence.entities.DivisionEntity;
import com.blockout.config.division.infrastructure.persistence.repositories.DivisionRepository;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Verifies Division update, image, and reactivation behavior. */
@ExtendWith(MockitoExtension.class)
@DisplayName("Division application service")
class DivisionApplicationServiceUnitTest {

    @Mock private DivisionRepository repository;
    @Mock private DivisionImageStorage imageStorage;
    @InjectMocks private DivisionApplicationService service;

    /** Replaces the managed image, applies supplied fields, and reactivates the division. */
    @Test
    @DisplayName("updates and reactivates a division with a replacement image")
    void updatesAndReactivatesDivision() {
        LocalDateTime timestamp = LocalDateTime.of(2026, 7, 19, 12, 30);
        DivisionEntity entity = DivisionEntity.builder().id(7L).name("Old").mainColor("#1")
                .firstGradientColor("#2").secondGradientColor("#3").thirdGradientColor("#4")
                .logoUrl("https://managed/old.png").active(false).createdAt(timestamp).lastUpdate(timestamp).build();
        DivisionImageCommand image = new DivisionImageCommand("new.png", "image/png", new byte[]{1});
        when(repository.findById(7L)).thenReturn(Optional.of(entity));
        when(imageStorage.uploadDivisionImage(image)).thenReturn("https://managed/new.png");
        when(repository.saveAndFlush(any(DivisionEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        DivisionView updated = service.update(7L,
                new UpdateDivisionCommand("New", null, null, null, null, image));

        assertThat(updated.name()).isEqualTo("New");
        assertThat(updated.logoUrl()).isEqualTo("https://managed/new.png");
        assertThat(updated.active()).isTrue();
        verify(imageStorage).deleteDivisionImage("https://managed/old.png");
    }
}
