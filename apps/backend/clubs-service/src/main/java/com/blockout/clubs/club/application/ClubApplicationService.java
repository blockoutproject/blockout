package com.blockout.clubs.club.application;

import com.blockout.clubs.club.application.commands.ClubImageCommand;
import com.blockout.clubs.club.application.commands.CreateClubCommand;
import com.blockout.clubs.club.application.commands.UpdateClubCommand;
import com.blockout.clubs.club.application.exceptions.ClubNotFoundException;
import com.blockout.clubs.club.application.ports.ClubEventPublisher;
import com.blockout.clubs.club.application.ports.ClubImageStorage;
import com.blockout.clubs.club.application.views.ClubView;
import com.blockout.clubs.club.infrastructure.persistence.entities.ClubEntity;
import com.blockout.clubs.club.infrastructure.persistence.repositories.ClubRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

/**
 * Transactional application service for V1 clubs.
 */
@Service
@RequiredArgsConstructor
public class ClubApplicationService implements ClubService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ClubApplicationService.class);
    private static final long MAX_IMAGE_SIZE = 5L * 1024L * 1024L;

    private final ClubRepository clubRepository;
    private final ClubEventPublisher eventPublisher;
    private final ClubImageStorage imageStorage;

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<ClubView> findClubs(List<String> ids, Boolean active) {
        List<String> safeIds = ids == null ? Collections.emptyList() : ids;
        List<ClubView> clubs = clubRepository.findFiltered(safeIds, safeIds.size(), active).stream()
            .map(this::toView)
            .toList();
        LOGGER.debug("Filtered clubs",
            keyValue("action", "list_clubs"),
            keyValue("ids", safeIds),
            keyValue("count", clubs.size()));
        return clubs;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public ClubView getClubById(String id) {
        return toView(loadClub(id));
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public ClubView createClub(CreateClubCommand command) {
        ClubEntity club = ClubEntity.builder()
            .id(command.id())
            .rawName(command.rawName())
            .name(command.name())
            .address(command.address())
            .city(command.city())
            .postalCode(command.postalCode())
            .email(command.email())
            .phoneNumber(command.phoneNumber())
            .website(command.website())
            .logoUrl(command.logoUrl())
            .active(true)
            .build();

        if (hasImage(command.image())) {
            validateImage(command.image());
            club.setLogoUrl(imageStorage.uploadClubImage(command.image()));
        }

        ClubView saved = toView(clubRepository.saveAndFlush(club));
        eventPublisher.publishClubUpsert(saved);
        LOGGER.info("Created club",
            keyValue("action", "create_club"),
            keyValue("clubId", saved.id()));
        return saved;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public ClubView updateClub(String id, UpdateClubCommand command) {
        ClubEntity club = loadClub(id);
        applyUpdates(club, command);

        if (hasImage(command.image())) {
            validateImage(command.image());
            deleteLogo(club.getLogoUrl());
            club.setLogoUrl(imageStorage.uploadClubImage(command.image()));
        } else if (command.logoUrl() == null) {
            deleteLogo(club.getLogoUrl());
            club.setLogoUrl(null);
        }

        if (!club.isActive()) {
            club.setActive(true);
            LOGGER.info("Reactivated club",
                keyValue("action", "reactivate_club"),
                keyValue("clubId", id));
        }

        ClubView updated = toView(clubRepository.saveAndFlush(club));
        eventPublisher.publishClubUpsert(updated);
        LOGGER.info("Updated club",
            keyValue("action", "update_club"),
            keyValue("clubId", updated.id()));
        return updated;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public void deactivateClub(String id) {
        ClubEntity club = loadClub(id);
        club.setActive(false);
        clubRepository.saveAndFlush(club);
        LOGGER.info("Deactivated club",
            keyValue("action", "deactivate_club"),
            keyValue("clubId", id));
    }

    /**
     * Loads the authoritative Club entity or raises the application-level not-found error.
     */
    private ClubEntity loadClub(String id) {
        return clubRepository.findById(id).orElseThrow(() -> {
            LOGGER.warn("Club not found",
                keyValue("action", "get_club_by_id"),
                keyValue("clubId", id));
            return new ClubNotFoundException(id);
        });
    }

    /**
     * Applies only the mutable fields explicitly supplied by an update command.
     */
    private void applyUpdates(ClubEntity club, UpdateClubCommand command) {
        if (command.rawName() != null) {
            club.setRawName(command.rawName());
        }
        if (command.name() != null) {
            club.setName(command.name());
        }
        if (command.address() != null) {
            club.setAddress(command.address());
        }
        if (command.city() != null) {
            club.setCity(command.city());
        }
        if (command.postalCode() != null) {
            club.setPostalCode(command.postalCode());
        }
        if (command.email() != null) {
            club.setEmail(command.email());
        }
        if (command.phoneNumber() != null) {
            club.setPhoneNumber(command.phoneNumber());
        }
        if (command.website() != null) {
            club.setWebsite(command.website());
        }
    }

    /**
     * Determines whether an image command contains uploadable bytes.
     */
    private boolean hasImage(ClubImageCommand image) {
        return image != null && !image.isEmpty();
    }

    /**
     * Enforces the existing Club image media-type and size limits.
     */
    private void validateImage(ClubImageCommand image) {
        if (!"image/png".equals(image.contentType()) && !"image/jpeg".equals(image.contentType())) {
            throw new IllegalArgumentException("Only PNG and JPEG images are allowed.");
        }
        if (image.content().length > MAX_IMAGE_SIZE) {
            throw new IllegalArgumentException("The maximum image size is 5 MB.");
        }
    }

    /**
     * Removes an existing managed logo while leaving external URLs untouched.
     */
    private void deleteLogo(String logoUrl) {
        if (logoUrl != null) {
            imageStorage.deleteClubImage(logoUrl);
        }
    }

    /**
     * Maps the persisted Club state to the application view returned by every use case.
     */
    private ClubView toView(ClubEntity club) {
        return new ClubView(
            club.getId(),
            club.getRawName(),
            club.getName(),
            club.getAddress(),
            club.getCity(),
            club.getPostalCode(),
            club.getEmail(),
            club.getPhoneNumber(),
            club.getWebsite(),
            club.getLogoUrl(),
            club.isActive(),
            club.getLatitude(),
            club.getLongitude(),
            club.getCreatedAt(),
            club.getLastUpdate());
    }
}
