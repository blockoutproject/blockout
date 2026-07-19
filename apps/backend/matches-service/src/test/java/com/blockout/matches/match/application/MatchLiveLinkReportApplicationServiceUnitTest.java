package com.blockout.matches.match.application;

import com.blockout.matches.match.application.models.LiveLinkStatus;
import com.blockout.matches.match.infrastructure.persistence.entities.MatchEntity;
import com.blockout.matches.match.infrastructure.persistence.entities.MatchLiveLinkEntity;
import com.blockout.matches.match.infrastructure.persistence.repositories.MatchLiveLinkReportRepository;
import com.blockout.matches.match.infrastructure.persistence.repositories.MatchLiveLinkRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MatchLiveLinkReportApplicationServiceUnitTest {

    @Mock MatchLiveLinkRepository liveLinkRepository;
    @Mock MatchLiveLinkReportRepository reportRepository;
    @Mock MatchLiveLinkModerationPolicy moderationPolicy;

    @Test
    void bansTheActiveLinkWhenTheExistingThresholdIsReached() {
        MatchLiveLinkEntity link = MatchLiveLinkEntity.builder()
                .id(9L).match(MatchEntity.builder().id(7L).build())
                .status(LiveLinkStatus.ACTIVE).reportCount(2).build();
        when(liveLinkRepository.findFirstByMatch_IdAndStatusOrderByCreatedAtDesc(7L, LiveLinkStatus.ACTIVE))
                .thenReturn(Optional.of(link));
        when(reportRepository.existsByLiveLink_IdAndReporterAuth0Id(9L, "auth0|2")).thenReturn(false);
        when(reportRepository.countByLiveLink_Id(9L)).thenReturn(3L);
        when(moderationPolicy.determineAutoHideThreshold(link.getMatch())).thenReturn(3);

        new MatchLiveLinkReportApplicationService(liveLinkRepository, reportRepository, moderationPolicy)
                .reportLiveLink(7L, "incorrect", "auth0|2");

        assertThat(link.getReportCount()).isEqualTo(3);
        assertThat(link.getStatus()).isEqualTo(LiveLinkStatus.BANNED);
        verify(reportRepository).save(any());
        verify(liveLinkRepository).saveAndFlush(link);
    }
}
