package com.blockout.matches.match.live.report.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.blockout.matches.exceptions.MatchNotFoundException;
import com.blockout.matches.match.live.report.persistence.MatchLiveLinkReportPersistenceMapper;
import com.blockout.matches.models.entities.Match;
import com.blockout.matches.models.entities.MatchLiveLink;
import com.blockout.matches.models.entities.MatchLiveLinkReport;
import com.blockout.matches.models.enums.LiveLinkStatus;
import com.blockout.matches.models.enums.LiveProvider;
import com.blockout.matches.models.enums.MatchStatus;
import com.blockout.matches.repositories.MatchLiveLinkReportRepository;
import com.blockout.matches.repositories.MatchLiveLinkRepository;
import com.blockout.matches.repositories.MatchRepository;
import com.blockout.matches.services.moderation.MatchLiveLinkModerationPolicy;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;
import org.springframework.dao.DataIntegrityViolationException;

class MatchLiveLinkReportApplicationServiceTest {

    private static final Instant NOW = Instant.parse("2026-07-17T10:00:00Z");
    private final MatchLiveLinkReportPersistenceMapper mapper =
            Mappers.getMapper(MatchLiveLinkReportPersistenceMapper.class);

    @Test
    void duplicateReportByTheSameSubjectAndVersionRemainsANoOp() {
        LiveLinkRepositoryDouble liveLinks = new LiveLinkRepositoryDouble(activeLink(MatchStatus.UPCOMING));
        ReportRepositoryDouble reports = new ReportRepositoryDouble();
        reports.exists = true;

        service(liveLinks, reports).report(
                1L, new ReportMatchLiveLinkCommand("duplicate report", "auth0|reporter"));

        assertThat(reports.saved).isEmpty();
        assertThat(reports.countCalls).isZero();
        assertThat(liveLinks.saved).isEmpty();
    }

    @Test
    void reportPersistsOwnedInputAndAutoBansAtTheExistingUpcomingThreshold() {
        MatchLiveLink active = activeLink(MatchStatus.UPCOMING);
        LiveLinkRepositoryDouble liveLinks = new LiveLinkRepositoryDouble(active);
        ReportRepositoryDouble reports = new ReportRepositoryDouble();
        reports.count = 3L;

        service(liveLinks, reports).report(
                1L, new ReportMatchLiveLinkCommand("inappropriate stream", "auth0|reporter"));

        assertThat(reports.saved).singleElement().satisfies(report -> {
            assertThat(report.getLiveLink()).isSameAs(active);
            assertThat(report.getReporterAuth0Id()).isEqualTo("auth0|reporter");
            assertThat(report.getReason()).isEqualTo("inappropriate stream");
            assertThat(report.getCreatedAt()).isEqualTo(NOW);
        });
        assertThat(active.getReportCount()).isEqualTo(3);
        assertThat(active.getStatus()).isEqualTo(LiveLinkStatus.BANNED);
        assertThat(active.getLastUpdate()).isEqualTo(NOW);
        assertThat(liveLinks.saved).containsExactly(active);
    }

    @Test
    void finishedMatchKeepsTheHigherTenReportThreshold() {
        MatchLiveLink active = activeLink(MatchStatus.FINISHED);
        LiveLinkRepositoryDouble liveLinks = new LiveLinkRepositoryDouble(active);
        ReportRepositoryDouble reports = new ReportRepositoryDouble();
        reports.count = 9L;

        service(liveLinks, reports).report(
                1L, new ReportMatchLiveLinkCommand("finished stream issue", "auth0|reporter"));

        assertThat(active.getStatus()).isEqualTo(LiveLinkStatus.ACTIVE);
        assertThat(active.getReportCount()).isEqualTo(9);
    }

    @Test
    void absentActiveLinkKeepsTheMatchNotFoundOutcome() {
        LiveLinkRepositoryDouble liveLinks = new LiveLinkRepositoryDouble(null);

        assertThatThrownBy(() -> service(liveLinks, new ReportRepositoryDouble()).report(
                1L, new ReportMatchLiveLinkCommand("missing stream", "auth0|reporter")))
                .isInstanceOf(MatchNotFoundException.class);
    }

    @Test
    void concurrentDuplicateConstraintFailureIsNotHiddenOrRetried() {
        LiveLinkRepositoryDouble liveLinks = new LiveLinkRepositoryDouble(activeLink(MatchStatus.UPCOMING));
        ReportRepositoryDouble reports = new ReportRepositoryDouble();
        reports.saveFailure = new DataIntegrityViolationException("duplicate");

        assertThatThrownBy(() -> service(liveLinks, reports).report(
                1L, new ReportMatchLiveLinkCommand("concurrent report", "auth0|reporter")))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(reports.countCalls).isZero();
        assertThat(liveLinks.saved).isEmpty();
    }

    private MatchLiveLinkReportApplicationService service(
            LiveLinkRepositoryDouble liveLinks,
            ReportRepositoryDouble reports) {
        MatchRepository matches = (MatchRepository) Proxy.newProxyInstance(
                MatchRepository.class.getClassLoader(), new Class<?>[]{MatchRepository.class},
                (proxy, method, arguments) -> switch (method.getName()) {
                    case "findById" -> Optional.empty();
                    case "toString" -> "MatchRepositoryDouble";
                    default -> throw new UnsupportedOperationException(method.getName());
                });
        return new MatchLiveLinkReportApplicationService(
                matches, liveLinks.proxy(), reports.proxy(), new MatchLiveLinkModerationPolicy(), mapper,
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static MatchLiveLink activeLink(MatchStatus status) {
        Match match = Match.builder().id(1L).matchCode("M1").leagueCode("L1").poolId(9L)
                .teamIdA(10L).teamIdB(11L).matchDate(NOW).season("2026").status(status)
                .active(true).createdAt(NOW).lastUpdate(NOW).build();
        return MatchLiveLink.builder().id(10L).match(match).ownerAuth0Id("auth0|owner")
                .provider(LiveProvider.YOUTUBE).url("https://youtu.be/a").status(LiveLinkStatus.ACTIVE)
                .reportCount(0).createdAt(NOW).lastUpdate(NOW).build();
    }

    private static final class LiveLinkRepositoryDouble implements InvocationHandler {
        private final MatchLiveLink active;
        private final List<MatchLiveLink> saved = new ArrayList<>();

        LiveLinkRepositoryDouble(MatchLiveLink active) {
            this.active = active;
        }

        MatchLiveLinkRepository proxy() {
            return (MatchLiveLinkRepository) Proxy.newProxyInstance(
                    MatchLiveLinkRepository.class.getClassLoader(),
                    new Class<?>[]{MatchLiveLinkRepository.class}, this);
        }

        @Override
        public Object invoke(Object proxy, java.lang.reflect.Method method, Object[] arguments) {
            return switch (method.getName()) {
                case "findFirstByMatch_IdAndStatusOrderByCreatedAtDesc" -> Optional.ofNullable(active);
                case "save" -> {
                    saved.add((MatchLiveLink) arguments[0]);
                    yield arguments[0];
                }
                case "toString" -> "LiveLinkRepositoryDouble";
                default -> throw new UnsupportedOperationException(method.getName());
            };
        }
    }

    private static final class ReportRepositoryDouble implements InvocationHandler {
        private final List<MatchLiveLinkReport> saved = new ArrayList<>();
        private boolean exists;
        private long count;
        private int countCalls;
        private RuntimeException saveFailure;

        MatchLiveLinkReportRepository proxy() {
            return (MatchLiveLinkReportRepository) Proxy.newProxyInstance(
                    MatchLiveLinkReportRepository.class.getClassLoader(),
                    new Class<?>[]{MatchLiveLinkReportRepository.class}, this);
        }

        @Override
        public Object invoke(Object proxy, java.lang.reflect.Method method, Object[] arguments) {
            return switch (method.getName()) {
                case "existsByLiveLink_IdAndReporterAuth0Id" -> exists;
                case "save" -> {
                    if (saveFailure != null) {
                        throw saveFailure;
                    }
                    saved.add((MatchLiveLinkReport) arguments[0]);
                    yield arguments[0];
                }
                case "countByLiveLink_Id" -> {
                    countCalls++;
                    yield count;
                }
                case "toString" -> "ReportRepositoryDouble";
                default -> throw new UnsupportedOperationException(method.getName());
            };
        }
    }
}
