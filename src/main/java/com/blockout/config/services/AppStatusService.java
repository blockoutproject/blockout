package com.blockout.config.services;

import com.blockout.config.models.dto.AppStatusDTO;
import com.blockout.config.models.dto.AppStatusUpdateDTO;
import com.blockout.config.models.entities.AppStatus;
import com.blockout.config.repositories.AppStatusRepository;
import com.blockout.config.utils.DiffUtils;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class AppStatusService {

    private static final Logger logger = LoggerFactory.getLogger(AppStatusService.class);

    private final AppStatusRepository appStatusRepository;

    /**
     * Récupère l'état global de l'application.
     */
    public AppStatusDTO getStatus() {
        AppStatus status = appStatusRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> {
                    logger.error("AppStatus row not found. Did you run Flyway migration?",
                            keyValue("action", "get_app_status_missing"));
                    return new NoSuchElementException("Configuration app_status introuvable.");
                });

        AppStatusDTO dto = toDto(status);

        logger.debug("Fetched app status",
                keyValue("action", "get_app_status"),
                keyValue("maintenance", dto.isMaintenance()),
                keyValue("message", dto.getMessage()),
                keyValue("image_url", dto.getImageUrl()),
                keyValue("updated_by", dto.getUpdatedBy()),
                keyValue("last_update", dto.getLastUpdate()),
                keyValue("config_id", status.getId()));

        return dto;
    }

    /**
     * Met à jour l'état global de l'application.
     */
    @Transactional
    public AppStatusDTO updateStatus(AppStatusUpdateDTO dto) {
        AppStatus existing = appStatusRepository.findFirstByOrderByIdAsc()
                .orElseThrow(() -> {
                    logger.error("AppStatus row not found. Cannot update.",
                            keyValue("action", "update_app_status_missing"));
                    return new NoSuchElementException("Configuration app_status introuvable.");
                });

        AppStatus before = existing.toBuilder().build();

        if (dto.getMaintenance() != null) {
            existing.setMaintenance(dto.getMaintenance());
        }
        if (dto.getMessage() != null) {
            existing.setMessage(dto.getMessage());
        }
        if (dto.getImageUrl() != null) {
            existing.setImageUrl(dto.getImageUrl());
        }

        AppStatus updated = appStatusRepository.save(existing);

        DiffUtils.logChanges(before, updated, logger, "update_app_status", updated.getId());

        logger.info("App status updated",
                keyValue("action", "update_app_status"),
                keyValue("config_id", updated.getId()),
                keyValue("maintenance", updated.isMaintenance()),
                keyValue("last_update", updated.getLastUpdate()));

        return toDto(updated);
    }

    private AppStatusDTO toDto(AppStatus entity) {
        return AppStatusDTO.builder()
                .maintenance(entity.isMaintenance())
                .message(entity.getMessage())
                .imageUrl(entity.getImageUrl())
                .updatedBy(entity.getUpdatedBy())
                .lastUpdate(entity.getLastUpdate())
                .build();
    }
}