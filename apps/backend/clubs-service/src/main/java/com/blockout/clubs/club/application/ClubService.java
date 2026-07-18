package com.blockout.clubs.club.application;

import com.blockout.shared.model.ImageChangeModeEnum;
import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.clubs.club.domain.ClubLogoUpload;
import com.blockout.clubs.shared.application.ChangeLog;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ClubService {

    private static final Logger LOGGER = LoggerFactory.getLogger(ClubService.class);

    private final ClubStore store;
    private final ClubLogoStorage logoStorage;
    private final ClubEventPublisher eventPublisher;

    @Transactional(readOnly = true)
    public List<ClubView> findLegacy(List<String> ids, Boolean active) {
        List<String> safeIds = ids == null ? Collections.emptyList() : ids;
        List<ClubView> clubs = store.findLegacy(safeIds, active);
        logList(safeIds, clubs.size());
        return clubs;
    }

    @Transactional(readOnly = true)
    public ClubPage findPage(List<String> ids, Boolean active, int page, int pageSize) {
        List<String> safeIds = ids == null ? Collections.emptyList() : ids;
        ClubPage result = store.findPage(safeIds, active, page, pageSize);
        logList(safeIds, result.items().size());
        return result;
    }

    @Transactional(readOnly = true)
    public ClubView getById(String id) {
        return find(id);
    }

    @Transactional
    public ClubView create(CreateClubCommand command, ClubLogoUpload image) {
        String logoUrl = image == null ? null : logoStorage.upload(image);
        ClubView view = store.create(command, logoUrl);
        LOGGER.info("New club created", keyValue("action", "create_club"), keyValue("clubId", view.id()));
        eventPublisher.publishUpsert(ClubUpsertFact.from(view));
        return view;
    }

    @Transactional
    public ClubView update(String id, UpdateClubCommand command, ClubLogoChange logoChange) {
        ClubUpdate update = store.findForUpdate(id).orElseThrow(() -> notFound(id));
        ClubView current = update.current();
        String replacementLogoUrl = null;
        boolean replaceLogo = logoChange.mode() != ImageChangeModeEnum.KEEP;

        if (replaceLogo && current.logoUrl() != null) {
            logoStorage.delete(current.logoUrl());
        }
        if (logoChange.mode() == ImageChangeModeEnum.REPLACE) {
            replacementLogoUrl = logoStorage.upload(logoChange.upload());
        }

        if (!current.active()) {
            LOGGER.info("Club reactivated", keyValue("action", "reactivate_club"),
                    keyValue("clubId", id), keyValue("clubName", current.name()));
        }

        ClubChange change = update.apply(new ClubUpdatePlan(command, replacementLogoUrl, replaceLogo, true));
        ChangeLog.logChanges(change.before(), change.after(), LOGGER, "update_club", change.after().id());
        eventPublisher.publishUpsert(ClubUpsertFact.from(change.after()));
        return change.after();
    }

    @Transactional
    public void deactivate(String id) {
        if (!store.deactivate(id)) {
            throw notFound(id);
        }
        LOGGER.info("Club successfully deactivated", keyValue("action", "deactivate_club"),
                keyValue("clubId", id));
    }

    private ClubView find(String id) {
        return store.findById(id).orElseThrow(() -> notFound(id));
    }

    private ClubNotFoundException notFound(String id) {
        LOGGER.warn("Club not found", keyValue("action", "get_club_by_id"), keyValue("clubId", id));
        return new ClubNotFoundException(id);
    }

    private void logList(List<String> ids, int count) {
        LOGGER.debug("Filtered clubs by IDs", keyValue("action", "list_clubs_by_ids"),
                keyValue("ids", ids), keyValue("count", count));
    }
}
