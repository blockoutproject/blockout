package com.blockout.config.rawdivisionmapping.application;

import com.blockout.config.rawdivisionmapping.application.commands.UpdateRawDivisionMappingCommand;
import com.blockout.config.rawdivisionmapping.application.models.Format;
import com.blockout.config.rawdivisionmapping.application.models.Gender;
import com.blockout.config.rawdivisionmapping.application.views.RawDivisionMappingView;
import com.blockout.config.rawdivisionmapping.infrastructure.persistence.entities.RawDivisionMappingEntity;
import com.blockout.config.rawdivisionmapping.infrastructure.persistence.repositories.RawDivisionMappingRepository;
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
 * Verifies raw division classification behavior and the derived mapped state.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Raw-division-mapping application service")
class RawDivisionMappingApplicationServiceUnitTest {

    @Mock
    private RawDivisionMappingRepository repository;
    @InjectMocks
    private RawDivisionMappingApplicationService service;

    /**
     * Marks the authoritative response as mapped after all classification fields are supplied.
     */
    @Test
    @DisplayName("derives mapped after classification")
    void derivesMappedAfterClassification() {
        LocalDateTime timestamp = LocalDateTime.of(2026, 7, 19, 12, 30);
        RawDivisionMappingEntity entity = RawDivisionMappingEntity.builder().id(1L).rawDivisionName("N3")
            .leagueCode("LNV").season("2026").createdAt(timestamp).lastUpdate(timestamp).build();
        when(repository.findById(1L)).thenReturn(Optional.of(entity));
        when(repository.saveAndFlush(any(RawDivisionMappingEntity.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        RawDivisionMappingView updated = service.update(1L,
            new UpdateRawDivisionMappingCommand(7L, Format.SIX, Gender.F));

        assertThat(updated.mapped()).isTrue();
        assertThat(updated.divisionId()).isEqualTo(7L);
    }
}
