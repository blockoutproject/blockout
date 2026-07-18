package com.blockout.matches.match.application;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.shared.application.ChangeLog;
import com.blockout.shared.model.MatchStatusEnum;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MatchApplicationService {

    private static final Logger LOGGER = LoggerFactory.getLogger(MatchApplicationService.class);

    private final MatchStore matches;
    private final MatchLiveProjectionStore liveLinks;
    private final MatchLifecycleEvents events;
    private final MatchDetailProjector details;

    @Transactional
    public MatchSnapshot create(CreateMatchCommand command) {
        return create(command, true);
    }

    @Transactional
    public MatchSnapshot createLegacy(CreateMatchCommand command, Boolean requestedActive) {
        return create(command, requestedActive == null || requestedActive);
    }

    private MatchSnapshot create(CreateMatchCommand command, boolean active) {
        MatchStatusEnum status = command.set() == null ? MatchStatusEnum.UPCOMING : MatchStatusEnum.FINISHED;
        MatchSnapshot saved = matches.create(command, status, active);
        LOGGER.info("Match created successfully", keyValue("action", "create_match"),
                keyValue("matchId", saved.id()));
        return saved;
    }

    @Transactional(readOnly = true)
    public List<MatchSnapshot> findAll(MatchQuery query) {
        return matches.findAll(query);
    }

    @Transactional(readOnly = true)
    public MatchPage findPage(MatchQuery query, int page, int pageSize) {
        return matches.findPage(query, page, pageSize);
    }

    @Transactional(readOnly = true)
    public MatchSnapshot findById(Long id) {
        return matches.findById(id).orElseThrow(() -> notFound(id));
    }

    @Transactional(readOnly = true)
    public MatchDetailView findDetail(Long id) {
        return details.project(findById(id), liveLinks.findNewestActive(id).orElse(null));
    }

    @Transactional
    public MatchSnapshot update(Long id, UpdateMatchCommand command) {
        MatchUpdate update = matches.findForUpdate(id).orElseThrow(() -> notFound(id));
        MatchSnapshot before = update.current();
        MatchStatusEnum targetStatus = before.status() == MatchStatusEnum.UPCOMING && command.set() != null
                ? MatchStatusEnum.FINISHED
                : before.status();
        MatchChange change = update.prepare(new MatchUpdatePlan(command, targetStatus, true));

        if (Boolean.FALSE.equals(change.before().active())) {
            LOGGER.info("Match reactivated", keyValue("matchId", id));
        }
        if (change.before().status() == MatchStatusEnum.UPCOMING
                && change.after().status() == MatchStatusEnum.FINISHED) {
            events.publishMatchFinished(new MatchFinishedEventInput(
                    change.after().id(), change.after().teamIdA(), change.after().teamIdB(),
                    change.after().poolId(), change.after().set()));
        }

        MatchSnapshot saved = update.save();
        ChangeLog.logChanges(change.before(), saved, LOGGER, "update_match", saved.id());
        return saved;
    }

    @Transactional
    public void deactivate(DeactivateMatchesCommand command) {
        LOGGER.info("Starting bulk match deactivation", keyValue("action", "bulk_deactivate_matches"),
                keyValue("poolId", command.poolId()), keyValue("matchCodesToDeactivate", command.missingMatchCodes()));
        int matchCount = matches.deactivate(command);
        if (matchCount == 0) {
            LOGGER.info("No active matches selected for deactivation", keyValue("action", "bulk_deactivate_matches"),
                    keyValue("poolId", command.poolId()));
            return;
        }
        LOGGER.info("Matches bulk deactivated", keyValue("action", "bulk_deactivate_matches"),
                keyValue("poolId", command.poolId()), keyValue("matchCount", matchCount));
    }

    private MatchNotFoundException notFound(Long id) {
        LOGGER.warn("Match not found", keyValue("matchId", id));
        return new MatchNotFoundException(id);
    }
}
