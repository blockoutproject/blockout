package com.blockout.matches.match.application;

import com.blockout.matches.match.application.commands.SetMatchLiveLinkCommand;
import com.blockout.matches.match.application.models.LiveLinkStatus;
import com.blockout.matches.match.application.models.LiveProvider;
import com.blockout.matches.match.application.models.MatchStatus;
import com.blockout.matches.match.application.ports.CurrentUserProvider;
import com.blockout.matches.match.application.ports.MatchEventPublisher;
import com.blockout.matches.match.application.views.CurrentUserView;
import com.blockout.matches.match.application.views.MatchLiveLinkResult;
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
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MatchLiveLinkApplicationServiceUnitTest {

    @Mock
    MatchRepository matchRepository;
    @Mock
    MatchLiveLinkRepository liveLinkRepository;
    @Mock
    CurrentUserProvider currentUserProvider;
    @Mock
    MatchLiveLinkModerationPolicy moderationPolicy;
    @Mock
    MatchEventPublisher eventPublisher;

    private MatchLiveLinkApplicationService service;

    @BeforeEach
    void setUp() {
        service = new MatchLiveLinkApplicationService(
            matchRepository, liveLinkRepository, currentUserProvider, moderationPolicy, eventPublisher);
    }

    @Test
    void createsAnActiveYoutubeLinkAndPublishesTheExistingEvent() {
        MatchEntity match = match();
        when(currentUserProvider.getCurrentUser()).thenReturn(
            new CurrentUserView(1L, "auth0|1", Instant.now().minus(30, ChronoUnit.DAYS)));
        when(matchRepository.findById(7L)).thenReturn(Optional.of(match));
        when(liveLinkRepository.findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(7L, LiveLinkStatus.ACTIVE))
            .thenReturn(Optional.empty());
        when(liveLinkRepository.countByMatch_IdAndOwnerAuth0Id(7L, "auth0|1")).thenReturn(0L);
        when(liveLinkRepository.countDistinctMatchesByOwnerAndDay(anyString(), any(), any())).thenReturn(0L);
        when(liveLinkRepository.saveAndFlush(any())).thenAnswer(invocation -> {
            MatchLiveLinkEntity link = invocation.getArgument(0);
            link.setId(9L);
            return link;
        });

        MatchLiveLinkResult result = service.upsertLiveLink(
            7L, new SetMatchLiveLinkCommand("https://www.youtube.com/watch?v=1"));

        assertThat(result.provider()).isEqualTo(LiveProvider.YOUTUBE);
        assertThat(result.status()).isEqualTo(LiveLinkStatus.ACTIVE);
        assertThat(result.ownerAuth0Id()).isEqualTo("auth0|1");
        verify(eventPublisher).publishMatchLiveLinkCreated(any());
    }

    private MatchEntity match() {
        Instant date = Instant.now().minus(10, ChronoUnit.MINUTES);
        return MatchEntity.builder()
            .id(7L).matchCode("M1").leagueCode("L1").poolId(2L).teamIdA(3L).teamIdB(4L)
            .matchDate(date).season("2026").status(MatchStatus.UPCOMING).active(true)
            .createdAt(date).lastUpdate(date).build();
    }
}
