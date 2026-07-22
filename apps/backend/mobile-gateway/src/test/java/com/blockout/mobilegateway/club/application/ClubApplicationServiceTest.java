package com.blockout.mobilegateway.club.application;

import com.blockout.mobilegateway.club.application.commands.UpdateClubCommand;
import com.blockout.mobilegateway.club.application.views.ClubView;
import com.blockout.mobilegateway.club.infrastructure.ClubInternalClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.multipart.MultipartFile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClubApplicationServiceTest {

    @Mock
    private ClubInternalClient clubInternalClient;

    @InjectMocks
    private ClubApplicationService clubService;

    @Test
    void hidesThePhoneNumberFromThePublicMobileView() {
        ClubView club = new ClubView(
            "club-1", "RAW", "Blockout", null, null, null, null, "0102030405",
            null, null, null, null, true, null, null);
        when(clubInternalClient.getClubById("club-1")).thenReturn(club);

        ClubView response = clubService.getClubById("club-1");

        assertThat(response).isNotSameAs(club);
        assertThat(response.phoneNumber()).isNull();
    }

    @Test
    void delegatesClubUpdatesWithoutChangingTheOwnerResponse() {
        UpdateClubCommand request = new UpdateClubCommand(
            null, "Blockout Paris", null, null, null, null, null, null, null);
        MultipartFile image = mock(MultipartFile.class);
        ClubView updated = new ClubView(
            "club-1", null, "Blockout Paris", null, null, null, null, null,
            null, null, null, null, true, null, null);
        when(clubInternalClient.updateClub("club-1", request, image)).thenReturn(updated);

        ClubView response = clubService.updateClub("club-1", request, image);

        assertThat(response).isSameAs(updated);
        verify(clubInternalClient).updateClub("club-1", request, image);
    }
}
