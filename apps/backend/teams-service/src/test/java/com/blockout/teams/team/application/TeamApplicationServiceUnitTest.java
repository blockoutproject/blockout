package com.blockout.teams.team.application;

import com.blockout.teams.team.application.commands.CreateTeamCommand;
import com.blockout.teams.team.application.commands.TeamImageCommand;
import com.blockout.teams.team.application.commands.UpdateTeamCommand;
import com.blockout.teams.team.application.models.Format;
import com.blockout.teams.team.application.models.Gender;
import com.blockout.teams.team.application.ports.TeamEventPublisher;
import com.blockout.teams.team.application.ports.TeamImageStorage;
import com.blockout.teams.team.infrastructure.persistence.entities.TeamEntity;
import com.blockout.teams.team.infrastructure.persistence.repositories.TeamRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Verifies Team use cases with persistence and outbound adapters isolated. */
@ExtendWith(MockitoExtension.class)
@DisplayName("Team application service")
class TeamApplicationServiceUnitTest {

    @Mock private TeamRepository teamRepository;
    @Mock private TeamEventPublisher eventPublisher;
    @Mock private TeamImageStorage imageStorage;
    private TeamApplicationService service;

    @BeforeEach
    void setUp() {
        service = new TeamApplicationService(teamRepository, eventPublisher, imageStorage);
        when(teamRepository.saveAndFlush(any(TeamEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    @DisplayName("creates defaults and publishes the Team search projection")
    void createsDefaultsAndPublishesTheTeamSearchProjection() {
        CreateTeamCommand command = new CreateTeamCommand(
                "club-1", "RAW", "Team", "BO", "LNV", 2L, "2026/2027",
                Format.SIX, Gender.F, null, null, null);

        var created = service.createTeam(command);

        assertThat(created.followersCount()).isZero();
        assertThat(created.active()).isTrue();
        verify(eventPublisher).publishTeamUpsert(created);
    }

    @Test
    @DisplayName("updates fields and replaces a managed logo")
    void updatesFieldsAndReplacesAManagedLogo() {
        TeamEntity existing = team(3L, true, "old-logo");
        when(teamRepository.findById(3L)).thenReturn(Optional.of(existing));
        TeamImageCommand image = new TeamImageCommand(new byte[]{1}, "team.png", "image/png");
        when(imageStorage.uploadTeamImage(image)).thenReturn("new-logo");
        UpdateTeamCommand command = new UpdateTeamCommand(
                null, null, "New Team", null, null, null, null, null, null, null, false, image);

        var updated = service.updateTeam(3L, command);

        verify(imageStorage).deleteTeamImage("old-logo");
        assertThat(updated.name()).isEqualTo("New Team");
        assertThat(updated.logoUrl()).isEqualTo("new-logo");
        assertThat(updated.active()).isFalse();
        verify(eventPublisher).publishTeamUpsert(updated);
    }

    @Test
    @DisplayName("clamps follower decrements and cascades Club deactivation")
    void clampsFollowerDecrementsAndCascadesClubDeactivation() {
        TeamEntity first = team(1L, true, null);
        first.setFollowersCount(0L);
        TeamEntity second = team(2L, true, null);
        when(teamRepository.findById(1L)).thenReturn(Optional.of(first));
        when(teamRepository.findByClubIdAndActiveTrue("club-1")).thenReturn(List.of(first, second));

        assertThat(service.decrementFollowersCount(1L, 9L).followersCount()).isZero();
        service.deactivateTeamsByClubId("club-1");

        assertThat(first.getActive()).isFalse();
        assertThat(second.getActive()).isFalse();
        verify(teamRepository).saveAllAndFlush(List.of(first, second));
    }

    private TeamEntity team(Long id, boolean active, String logoUrl) {
        return TeamEntity.builder().id(id).clubId("club-1").rawName("RAW").name("Team").shortName("BO")
                .leagueCode("LNV").divisionId(2L).season("2026/2027").format(Format.SIX).gender(Gender.F)
                .followersCount(0L).logoUrl(logoUrl).active(active).build();
    }
}
