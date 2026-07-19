package com.blockout.clubs.club.application;

import com.blockout.clubs.club.application.commands.ClubImageCommand;
import com.blockout.clubs.club.application.commands.CreateClubCommand;
import com.blockout.clubs.club.application.commands.UpdateClubCommand;
import com.blockout.clubs.club.application.views.ClubView;
import com.blockout.clubs.club.infrastructure.messaging.ClubEventPublisher;
import com.blockout.clubs.club.infrastructure.persistence.entities.ClubEntity;
import com.blockout.clubs.club.infrastructure.persistence.repositories.ClubRepository;
import com.blockout.clubs.club.infrastructure.storage.S3StorageClientService;
import org.junit.jupiter.api.BeforeEach;
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

@ExtendWith(MockitoExtension.class)
class ClubApplicationServiceTest {

    @Mock
    private ClubRepository clubRepository;
    @Mock
    private ClubEventPublisher eventPublisher;
    @Mock
    private S3StorageClientService storageClient;

    private ClubApplicationService service;

    @BeforeEach
    void setUp() {
        service = new ClubApplicationService(clubRepository, eventPublisher, storageClient);
        when(clubRepository.saveAndFlush(any(ClubEntity.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

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
        when(storageClient.uploadClubImage(image)).thenReturn("new-logo");
        UpdateClubCommand command = new UpdateClubCommand(
                "NEW RAW", "New", "New address", "Lyon", "69001",
                "new-mail", "new-phone", "new-website", null, image);

        ClubView updated = service.updateClub("club-1", command);

        verify(storageClient).deleteObjectByUrl(existingLogoUrl());
        assertThat(updated.rawName()).isEqualTo("NEW RAW");
        assertThat(updated.address()).isEqualTo("New address");
        assertThat(updated.logoUrl()).isEqualTo("new-logo");
        assertThat(updated.active()).isTrue();
        verify(eventPublisher).publishClubUpsert(updated);
    }

    @Test
    void deactivatesAnExistingClub() {
        ClubEntity existing = ClubEntity.builder().id("club-1").active(true).build();
        when(clubRepository.findById("club-1")).thenReturn(Optional.of(existing));

        service.deactivateClub("club-1");

        assertThat(existing.isActive()).isFalse();
        verify(clubRepository).saveAndFlush(existing);
    }

    private String existingLogoUrl() {
        return "https://bucket.s3.eu-west-3.amazonaws.com/clubs/old.png";
    }
}
