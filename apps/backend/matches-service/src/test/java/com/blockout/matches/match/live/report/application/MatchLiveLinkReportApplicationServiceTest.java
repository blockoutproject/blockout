package com.blockout.matches.match.live.report.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.shared.model.LiveLinkStatusEnum;
import com.blockout.shared.model.MatchStatusEnum;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

class MatchLiveLinkReportApplicationServiceTest {

    private static final Instant NOW = Instant.parse("2026-07-17T10:00:00Z");

    @Test
    void duplicateReportByTheSameSubjectAndVersionRemainsANoOp() {
        StoreDouble store = new StoreDouble(target(MatchStatusEnum.UPCOMING));
        store.exists = true;

        service(store).report(1L, new ReportMatchLiveLinkCommand("duplicate report", "auth0|reporter"));

        assertThat(store.created).isEmpty();
        assertThat(store.countCalls).isZero();
        assertThat(store.updates).isEmpty();
    }

    @Test
    void reportPersistsOwnedInputAndAutoBansAtTheExistingUpcomingThreshold() {
        StoreDouble store = new StoreDouble(target(MatchStatusEnum.UPCOMING));
        store.count = 3L;

        service(store).report(1L, new ReportMatchLiveLinkCommand("inappropriate stream", "auth0|reporter"));

        assertThat(store.created).containsExactly(
                new NewMatchLiveLinkReport(10L, "auth0|reporter", "inappropriate stream", NOW));
        assertThat(store.updates).containsExactly(
                new TargetUpdate(10L, 3, LiveLinkStatusEnum.BANNED, NOW));
    }

    @Test
    void finishedMatchKeepsTheHigherTenReportThreshold() {
        StoreDouble store = new StoreDouble(target(MatchStatusEnum.FINISHED));
        store.count = 9L;

        service(store).report(1L, new ReportMatchLiveLinkCommand("finished stream issue", "auth0|reporter"));

        assertThat(store.updates).containsExactly(
                new TargetUpdate(10L, 9, LiveLinkStatusEnum.ACTIVE, NOW));
    }

    @Test
    void absentActiveLinkKeepsTheMatchNotFoundOutcome() {
        StoreDouble store = new StoreDouble(null);

        assertThatThrownBy(() -> service(store).report(
                1L, new ReportMatchLiveLinkCommand("missing stream", "auth0|reporter")))
                .isInstanceOf(MatchNotFoundException.class);
    }

    @Test
    void concurrentDuplicateConstraintFailureIsNotHiddenOrRetried() {
        StoreDouble store = new StoreDouble(target(MatchStatusEnum.UPCOMING));
        store.createFailure = new DataIntegrityViolationException("duplicate");

        assertThatThrownBy(() -> service(store).report(
                1L, new ReportMatchLiveLinkCommand("concurrent report", "auth0|reporter")))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(store.countCalls).isZero();
        assertThat(store.updates).isEmpty();
    }

    private MatchLiveLinkReportApplicationService service(StoreDouble store) {
        return new MatchLiveLinkReportApplicationService(
                store, new MatchLiveLinkReportPolicy(), Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static MatchLiveLinkReportTarget target(MatchStatusEnum status) {
        return new MatchLiveLinkReportTarget(10L, 1L, status, LiveLinkStatusEnum.ACTIVE);
    }

    private record TargetUpdate(
            Long liveLinkId,
            int reportCount,
            LiveLinkStatusEnum status,
            Instant now) {
    }

    private static final class StoreDouble implements MatchLiveLinkReportStore {
        private final MatchLiveLinkReportTarget target;
        private final List<NewMatchLiveLinkReport> created = new ArrayList<>();
        private final List<TargetUpdate> updates = new ArrayList<>();
        private boolean exists;
        private long count;
        private int countCalls;
        private RuntimeException createFailure;

        StoreDouble(MatchLiveLinkReportTarget target) {
            this.target = target;
        }

        @Override
        public Optional<MatchLiveLinkReportTarget> findNewestActive(Long matchId) {
            return Optional.ofNullable(target);
        }

        @Override
        public boolean exists(Long liveLinkId, String reporterAuth0Id) {
            return exists;
        }

        @Override
        public void create(NewMatchLiveLinkReport report) {
            if (createFailure != null) {
                throw createFailure;
            }
            created.add(report);
        }

        @Override
        public long count(Long liveLinkId) {
            countCalls++;
            return count;
        }

        @Override
        public void updateTarget(
                Long liveLinkId,
                int reportCount,
                LiveLinkStatusEnum status,
                Instant now) {
            updates.add(new TargetUpdate(liveLinkId, reportCount, status, now));
        }
    }
}
