package com.blockout.mobilegateway.club.application;

import com.blockout.mobilegateway.club.api.models.ClubResponse;
import com.blockout.mobilegateway.club.api.models.UpdateClubRequest;
import com.blockout.mobilegateway.club.infrastructure.ClubInternalClient;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ClubApplicationService {

    private static final Logger logger = LoggerFactory.getLogger(ClubApplicationService.class);

    private final ClubInternalClient clubInternalClient;

    public ClubResponse getClubById(String id) {
        logger.info("Fetching club",
            keyValue("action", "get_club_by_id"),
            keyValue("club_id", id));

        ClubResponse club = clubInternalClient.getClubById(id);

        // The public mobile view intentionally hides the club phone number.
        club.setPhoneNumber(null);
        return club;
    }

    public ClubResponse updateClub(String id, UpdateClubRequest dto, MultipartFile image) {
        logger.info("Updating club",
            keyValue("action", "update_club"),
            keyValue("club_id", id),
            keyValue("has_image", image != null),
            keyValue("club_name", dto != null ? dto.getName() : null));
        return clubInternalClient.updateClub(id, dto, image);
    }
}
