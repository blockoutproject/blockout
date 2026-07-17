package com.blockout.clubs.club.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.clubs.club.persistence.ClubEntity;
import com.blockout.clubs.club.persistence.ClubPersistenceMapper;
import com.blockout.clubs.club.persistence.ClubRepository;
import com.blockout.clubs.exceptions.ClubNotFoundException;
import com.blockout.clubs.utils.DiffUtils;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ClubService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ClubService.class);

    private final ClubRepository repository;
    private final ClubPersistenceMapper mapper;
    private final ClubLogoStorage logoStorage;
    private final ClubEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public List<ClubView> findLegacy(List<String> ids, Boolean active) {
        List<String> safeIds = ids == null ? Collections.emptyList() : ids;
        List<ClubView> clubs = repository.findFilteredLegacy(safeIds, safeIds.size(), active).stream()
                .map(mapper::toView)
                .toList();
        logList(safeIds, clubs.size());
        return clubs;
    }

    @Transactional(readOnly = true)
    public ClubPage findPage(List<String> ids, Boolean active, int page, int pageSize) {
        List<String> safeIds = ids == null ? Collections.emptyList() : ids;
        PageRequest request = PageRequest.of(page, pageSize, Sort.by("name").ascending().and(Sort.by("id")));
        Page<ClubEntity> result = repository.findFiltered(safeIds, safeIds.size(), active, request);
        List<ClubView> items = result.getContent().stream().map(mapper::toView).toList();
        logList(safeIds, items.size());
        return new ClubPage(items, page, pageSize, result.getTotalElements(), result.hasNext());
    }

    @Transactional(readOnly = true)
    public ClubView getById(String id) {
        return mapper.toView(findEntity(id));
    }

    @Transactional
    public ClubView create(CreateClubCommand command, ClubLogoUpload image) {
        ClubEntity entity = mapper.toEntity(command);
        entity.setActive(true);
        if (image != null) {
            entity.setLogoUrl(logoStorage.upload(image));
        }
        ClubEntity saved = repository.save(entity);
        ClubView view = mapper.toView(saved);
        LOGGER.info("New club created", keyValue("action", "create_club"), keyValue("clubId", saved.getId()));
        eventPublisher.publishUpsert(view);
        return view;
    }

    @Transactional
    public ClubView update(String id, UpdateClubCommand command, ClubLogoChange logoChange) {
        ClubEntity entity = findEntity(id);
        ClubEntity before = entity.toBuilder().build();
        mapper.apply(command, entity);
        applyLogoChange(entity, logoChange);

        if (!entity.getActive()) {
            entity.setActive(true);
            LOGGER.info("Club reactivated", keyValue("action", "reactivate_club"),
                    keyValue("clubId", id), keyValue("clubName", entity.getName()));
        }

        ClubEntity saved = repository.save(entity);
        ClubView view = mapper.toView(saved);
        DiffUtils.logChanges(before, saved, LOGGER, "update_club", saved.getId());
        eventPublisher.publishUpsert(view);
        return view;
    }

    @Transactional
    public void deactivate(String id) {
        ClubEntity entity = findEntity(id);
        entity.setActive(false);
        repository.save(entity);
        LOGGER.info("Club successfully deactivated", keyValue("action", "deactivate_club"),
                keyValue("clubId", id));
    }

    private void applyLogoChange(ClubEntity entity, ClubLogoChange logoChange) {
        if (logoChange.mode() == ClubLogoChange.Mode.KEEP) {
            return;
        }
        if (entity.getLogoUrl() != null) {
            logoStorage.delete(entity.getLogoUrl());
        }
        if (logoChange.mode() == ClubLogoChange.Mode.REMOVE) {
            entity.setLogoUrl(null);
            return;
        }
        entity.setLogoUrl(logoStorage.upload(logoChange.upload()));
    }

    private ClubEntity findEntity(String id) {
        return repository.findById(id).orElseThrow(() -> {
            LOGGER.warn("Club not found", keyValue("action", "get_club_by_id"), keyValue("clubId", id));
            return new ClubNotFoundException(id);
        });
    }

    private void logList(List<String> ids, int count) {
        LOGGER.debug("Filtered clubs by IDs", keyValue("action", "list_clubs_by_ids"),
                keyValue("ids", ids), keyValue("count", count));
    }
}
