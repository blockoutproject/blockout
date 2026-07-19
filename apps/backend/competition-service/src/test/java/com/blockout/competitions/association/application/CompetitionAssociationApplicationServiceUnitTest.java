package com.blockout.competitions.association.application;

import com.blockout.competitions.association.application.commands.UpdateAssociationStatsCommand;
import com.blockout.competitions.association.application.ports.CompetitionDeactivationPublisher;
import com.blockout.competitions.association.infrastructure.persistence.entities.CompetitionAssociationEntity;
import com.blockout.competitions.association.infrastructure.persistence.repositories.CompetitionAssociationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Competition Association application service")
class CompetitionAssociationApplicationServiceUnitTest {

    @Mock
    private CompetitionAssociationRepository repository;

    @Mock
    private CompetitionDeactivationPublisher publisher;

    private CompetitionAssociationApplicationService service;

    @BeforeEach
    void setUp() {
        service = new CompetitionAssociationApplicationService(repository, publisher);
    }

    @Test
    @DisplayName("creates a complete association with the established defaults")
    void createsAssociationWithDefaults() {
        when(repository.findByPoolIdAndTeamId(10L, 20L)).thenReturn(Optional.empty());
        when(repository.saveAndFlush(org.mockito.ArgumentMatchers.any())).thenAnswer(invocation -> {
            CompetitionAssociationEntity entity = invocation.getArgument(0);
            entity.setId(1L);
            return entity;
        });

        var created = service.addOrReactivateAssociation(10L, 20L, "club-1");

        assertThat(created.id()).isEqualTo(1L);
        assertThat(created.clubId()).isEqualTo("club-1");
        assertThat(created.active()).isTrue();
        assertThat(created.points()).isZero();
        assertThat(created.coefPoints()).isZero();
    }

    @Test
    @DisplayName("does not mutate an association that is already active")
    void activeAssociationIsIdempotent() {
        CompetitionAssociationEntity existing = association(true);
        when(repository.findByPoolIdAndTeamId(10L, 20L)).thenReturn(Optional.of(existing));

        var result = service.addOrReactivateAssociation(10L, 20L, "different-club");

        assertThat(result.clubId()).isEqualTo("club-1");
        verify(repository, never()).saveAndFlush(existing);
    }

    @Test
    @DisplayName("deactivates pool associations and publishes only exhausted owners")
    void cascadesOnlyExhaustedOwners() {
        CompetitionAssociationEntity association = association(true);
        when(repository.findByActiveTrueAndPoolIdIn(Set.of(10L))).thenReturn(List.of(association));
        when(repository.existsByPoolIdAndActiveTrue(10L)).thenReturn(false);
        when(repository.existsByTeamIdAndActiveTrue(20L)).thenReturn(false);
        when(repository.findDistinctClubIdsByTeamIds(Set.of(20L))).thenReturn(List.of("club-1"));
        when(repository.existsByClubIdAndActiveTrue("club-1")).thenReturn(true);

        service.bulkDeactivatePools(List.of(10L));

        assertThat(association.getActive()).isFalse();
        verify(publisher).publishPoolDeactivation(10L);
        verify(publisher).publishTeamDeactivation(20L);
        verify(publisher, never()).publishClubDeactivation("club-1");
    }

    @Test
    @DisplayName("replaces every stored association statistic")
    void updatesEveryStatistic() {
        CompetitionAssociationEntity association = association(true);
        when(repository.findByPoolIdAndTeamId(10L, 20L)).thenReturn(Optional.of(association));
        when(repository.saveAndFlush(association)).thenReturn(association);
        UpdateAssociationStatsCommand command = new UpdateAssociationStatsCommand(
                3, 2, 1, 7, 1, 1, 0, 0, 1, 0, 7, 4, 240, 220, 0, 1.75, 1.09);

        var updated = service.updateTeamAssociationStats(10L, 20L, command);

        assertThat(updated.played()).isEqualTo(3);
        assertThat(updated.lossesOneToThree()).isEqualTo(1);
        assertThat(updated.wonPoints()).isEqualTo(240);
        assertThat(updated.coefPoints()).isEqualTo(1.09);
    }

    private CompetitionAssociationEntity association(boolean active) {
        return CompetitionAssociationEntity.builder()
                .id(1L)
                .poolId(10L)
                .teamId(20L)
                .clubId("club-1")
                .active(active)
                .build();
    }
}
