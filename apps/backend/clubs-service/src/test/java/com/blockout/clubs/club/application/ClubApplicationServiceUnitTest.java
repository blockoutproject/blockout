package com.blockout.clubs.club.application;

import com.blockout.clubs.club.application.commands.ClubImageCommand;
import com.blockout.clubs.club.application.commands.CreateClubCommand;
import com.blockout.clubs.club.application.commands.UpdateClubCommand;
import com.blockout.clubs.club.application.ports.ClubEventPublisher;
import com.blockout.clubs.club.application.ports.ClubImageStorage;
import com.blockout.clubs.club.application.views.ClubView;
import com.blockout.clubs.club.infrastructure.persistence.entities.ClubEntity;
import com.blockout.clubs.club.infrastructure.persistence.repositories.ClubRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Verifies Club use cases with persistence and outbound adapters isolated.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Club application service")
class ClubApplicationServiceUnitTest {

    @Mock
    private ClubRepository clubRepository;
    @Mock
    private ClubEventPublisher eventPublisher;
    @Mock
    private ClubImageStorage imageStorage;

    private ClubApplicationService service;

    /**
     * Creates the application service with isolated outbound boundaries.
     */
    @BeforeEach
    @DisplayName("creates the service fixture")
    void setUp() {
        service = new ClubApplicationService(clubRepository, eventPublisher, imageStorage);
        when(clubRepository.saveAndFlush(any(ClubEntity.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));
    }

    /**
     * Verifies complete persistence and lifecycle publication during creation.
     */
    @DisplayName("creates the complete Club and publishes its lifecycle projection")
    @Test
    void createsTheCompleteClubAndPublishesItsLifecycleProjection() {
        CreateClubCommand command = new CreateClubCommand(
            "club-1", "RAW", "Club", "1 Club Street", "Paris", "75001",
            "mail", "phone", "website", "existing-logo", null);

        ClubView created = service.createClub(command);

        ArgumentCaptor<ClubEntity> entity = ArgumentCaptor.forClass(ClubEntity.class);
        verify(clubRepository).saveAndFlush(entity.capture());
        assertThat(entity.getValue().getAddress()).isEqualTo("1 Club Street");
        assertThat(entity.getValue().getLogoUrl()).isEqualTo("existing-logo");
        assertThat(created.active()).isTrue();
        verify(eventPublisher).publishClubUpsert(created);
    }

    /**
     * Verifies partial updates, logo replacement, and imported reactivation behavior.
     */
    @DisplayName("updates mutable fields, replaces the logo, and reactivates the Club")
    @Test
    void replacesTheLogoUpdatesAllMutableFieldsAndReactivatesTheClub() {
        ClubEntity existing = ClubEntity.builder()
            .id("club-1")
            .rawName("OLD RAW")
            .name("Old")
            .address("Old address")
            .logoUrl("https://bucket.s3.eu-west-3.amazonaws.com/clubs/old.png")
            .active(false)
            .build();
        when(clubRepository.findById("club-1")).thenReturn(Optional.of(existing));
        ClubImageCommand image = new ClubImageCommand(new byte[]{1}, "new.png", "image/png");
        when(imageStorage.uploadClubImage(image)).thenReturn("new-logo");
        UpdateClubCommand command = new UpdateClubCommand(
            "NEW RAW", "New", "New address", "Lyon", "69001",
            "new-mail", "new-phone", "new-website", null, image);

        ClubView updated = service.updateClub("club-1", command);

        verify(imageStorage).deleteClubImage(existingLogoUrl());
        assertThat(updated.rawName()).isEqualTo("NEW RAW");
        assertThat(updated.address()).isEqualTo("New address");
        assertThat(updated.logoUrl()).isEqualTo("new-logo");
        assertThat(updated.active()).isTrue();
        verify(eventPublisher).publishClubUpsert(updated);
    }

    /**
     * Verifies that deactivation remains a persisted soft delete.
     */
    @DisplayName("soft-deletes an existing Club")
    @Test
    void deactivatesAnExistingClub() {
        ClubEntity existing = ClubEntity.builder().id("club-1").active(true).build();
        when(clubRepository.findById("club-1")).thenReturn(Optional.of(existing));

        service.deactivateClub("club-1");

        assertThat(existing.isActive()).isFalse();
        verify(clubRepository).saveAndFlush(existing);
    }

    /**
     * Returns a deterministic URL owned by the mocked S3 adapter.
     */
    private String existingLogoUrl() {
        return "https://bucket.s3.eu-west-3.amazonaws.com/clubs/old.png";
    }
}
