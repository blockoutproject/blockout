package com.blockout.mobilegateway.club.application;

import com.blockout.mobilegateway.club.api.models.ClubResponse;
import com.blockout.mobilegateway.club.api.models.UpdateClubRequest;
import com.blockout.mobilegateway.club.infrastructure.ClubInternalClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ClubApplicationServiceTest {

    @Mock
    private ClubInternalClient clubInternalClient;

    @InjectMocks
    private ClubApplicationService clubService;

    @Test
    void hidesThePhoneNumberFromThePublicMobileView() {
        ClubResponse club = ClubResponse.builder()
                .id("club-1")
                .name("Blockout")
                .phoneNumber("0102030405")
                .build();
        when(clubInternalClient.getClubById("club-1")).thenReturn(club);

        ClubResponse response = clubService.getClubById("club-1");

        assertThat(response).isSameAs(club);
        assertThat(response.getPhoneNumber()).isNull();
    }

    @Test
    void delegatesClubUpdatesWithoutChangingTheOwnerResponse() {
        UpdateClubRequest request = UpdateClubRequest.builder().name("Blockout Paris").build();
        MultipartFile image = mock(MultipartFile.class);
        ClubResponse updated = ClubResponse.builder().id("club-1").name("Blockout Paris").build();
        when(clubInternalClient.updateClub("club-1", request, image)).thenReturn(updated);

        ClubResponse response = clubService.updateClub("club-1", request, image);

        assertThat(response).isSameAs(updated);
        verify(clubInternalClient).updateClub("club-1", request, image);
    }
}
