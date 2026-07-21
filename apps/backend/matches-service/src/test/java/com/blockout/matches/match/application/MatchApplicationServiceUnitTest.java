package com.blockout.matches.match.application;

import com.blockout.matches.match.application.commands.CreateMatchCommand;
import com.blockout.matches.match.application.commands.UpdateMatchCommand;
import com.blockout.matches.match.application.models.LiveLinkStatus;
import com.blockout.matches.match.application.models.LiveProvider;
import com.blockout.matches.match.application.models.MatchStatus;
import com.blockout.matches.match.application.ports.MatchEventPublisher;
import com.blockout.matches.match.application.views.MatchView;
import com.blockout.matches.match.infrastructure.persistence.entities.MatchEntity;
import com.blockout.matches.match.infrastructure.persistence.entities.MatchLiveLinkEntity;
import com.blockout.matches.match.infrastructure.persistence.repositories.MatchLiveLinkRepository;
import com.blockout.matches.match.infrastructure.persistence.repositories.MatchRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MatchApplicationServiceUnitTest {

    @Mock
    MatchRepository matchRepository;
    @Mock
    MatchLiveLinkRepository liveLinkRepository;
    @Mock
    MatchEventPublisher eventPublisher;

    private MatchApplicationService service;

    @BeforeEach
    void setUp() {
        service = new MatchApplicationService(matchRepository, liveLinkRepository, eventPublisher);
    }

    @Test
    void createsUpcomingMatchAndMapsPersistenceTimestamps() {
        Instant date = Instant.parse("2026-08-01T18:00:00Z");
        when(matchRepository.saveAndFlush(any())).thenAnswer(invocation -> {
            MatchEntity entity = invocation.getArgument(0);
            entity.setId(1L);
            entity.setCreatedAt(date);
            entity.setLastUpdate(date);
            return entity;
        });

        MatchView created = service.createMatch(new CreateMatchCommand(
            "M1", "L1", 2L, null, 3L, 4L, date, "2026", null, null,
            "Gym", null, null, null));

        assertThat(created.status()).isEqualTo(MatchStatus.UPCOMING);
        assertThat(created.active()).isTrue();
        assertThat(created.createdAt()).isEqualTo(date);
    }

    @Test
    void publishesFinishedEventOnlyOnUpcomingToFinishedTransition() {
        Instant date = Instant.parse("2026-08-01T18:00:00Z");
        MatchEntity existing = match(1L, date);
        when(matchRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(liveLinkRepository.findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(1L, LiveLinkStatus.ACTIVE))
            .thenReturn(Optional.empty());
        when(matchRepository.saveAndFlush(existing)).thenReturn(existing);

        MatchView updated = service.updateMatch(1L, new UpdateMatchCommand(
            "M1", "L1", 2L, null, 3L, 4L, date, "2026", "3-0", "75-60",
            "Gym", "Ref A", "Ref B"));

        assertThat(updated.status()).isEqualTo(MatchStatus.FINISHED);
        verify(eventPublisher).publishMatchFinished(updated);
    }

    @Test
    void enrichesFilteredMatchesWithTheActiveLiveLink() {
        Instant date = Instant.parse("2026-08-01T18:00:00Z");
        MatchEntity match = match(1L, date);
        MatchLiveLinkEntity link = MatchLiveLinkEntity.builder()
            .id(9L).match(match).provider(LiveProvider.YOUTUBE).url("https://youtube.com/live/1")
            .ownerAuth0Id("auth0|1").status(LiveLinkStatus.ACTIVE).createdAt(date).build();
        when(matchRepository.findFiltered(null, null, true, List.of(), 0)).thenReturn(List.of(match));
        when(liveLinkRepository.findByMatchIdInAndStatus(List.of(1L), LiveLinkStatus.ACTIVE))
            .thenReturn(List.of(link));

        MatchView result = service.findMatches(null, List.of(), null, true).getFirst();

        assertThat(result.liveUrl()).isEqualTo("https://youtube.com/live/1");
        assertThat(result.liveProvider()).isEqualTo(LiveProvider.YOUTUBE);
        assertThat(result.liveOwnerAuth0Id()).isEqualTo("auth0|1");
    }

    private MatchEntity match(Long id, Instant date) {
        return MatchEntity.builder()
            .id(id).matchCode("M1").leagueCode("L1").poolId(2L).teamIdA(3L).teamIdB(4L)
            .matchDate(date).season("2026").status(MatchStatus.UPCOMING).active(true)
            .createdAt(date).lastUpdate(date).build();
    }
}
