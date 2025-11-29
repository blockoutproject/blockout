package com.blockout.config.services;

import com.blockout.config.exceptions.AppStatusNotFoundException;
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

@Service
@RequiredArgsConstructor
public class AppStatusService {

    private static final Logger logger = LoggerFactory.getLogger(AppStatusService.class);

    private final AppStatusRepository repo;

    public AppStatusDTO getStatus() {
        AppStatus entity = repo.findFirstByOrderByIdAsc()
                .orElseThrow(AppStatusNotFoundException::new);

        return toDto(entity);
    }

    @Transactional
    public AppStatusDTO updateStatus(AppStatusUpdateDTO dto) {
        AppStatus entity = repo.findFirstByOrderByIdAsc()
                .orElseThrow(AppStatusNotFoundException::new);

        AppStatus before = entity.toBuilder().build();

        if (dto.getMaintenance() != null) {
            entity.setMaintenance(dto.getMaintenance());
        }
        if (dto.getMessage() != null) {
            entity.setMessage(dto.getMessage());
        }
        if (dto.getImageUrl() != null) {
            entity.setImageUrl(dto.getImageUrl());
        }
        if (dto.getMinVersionIos() != null) {
            entity.setMinVersionIos(dto.getMinVersionIos());
        }
        if (dto.getMinVersionAndroid() != null) {
            entity.setMinVersionAndroid(dto.getMinVersionAndroid());
        }
        if (dto.getForceUpdateMessage() != null) {
            entity.setForceUpdateMessage(dto.getForceUpdateMessage());
        }
        if (dto.getStoreUrlIos() != null) {
            entity.setStoreUrlIos(dto.getStoreUrlIos());
        }
        if (dto.getStoreUrlAndroid() != null) {
            entity.setStoreUrlAndroid(dto.getStoreUrlAndroid());
        }

        AppStatus saved = repo.save(entity);

        DiffUtils.logChanges(before, saved, logger, "update_app_status", saved.getId());

        return toDto(saved);
    }

    private AppStatusDTO toDto(AppStatus e) {
        return AppStatusDTO.builder()
                .maintenance(e.isMaintenance())
                .message(e.getMessage())
                .imageUrl(e.getImageUrl())
                .minVersionIos(e.getMinVersionIos())
                .minVersionAndroid(e.getMinVersionAndroid())
                .storeUrlIos(e.getStoreUrlIos())
                .storeUrlAndroid(e.getStoreUrlAndroid())
                .forceUpdateMessage(e.getForceUpdateMessage())
                .lastUpdate(e.getLastUpdate())
                .build();
    }
}