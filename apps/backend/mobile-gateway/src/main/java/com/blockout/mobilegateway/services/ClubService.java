package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.models.dto.club.ClubDTO;
import com.blockout.mobilegateway.models.dto.club.ClubUpdateDTO;
import com.blockout.mobilegateway.services.clients.ClubClientService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ClubService {

    private static final Logger logger = LoggerFactory.getLogger(ClubService.class);

    private final ClubClientService clubClientService;

    public ClubDTO getClubById(String id) {
        logger.info("Fetching club",
                keyValue("action", "get_club_by_id"),
                keyValue("club_id", id));
        
        ClubDTO club = clubClientService.getClubById(id);
        
        // Force le champ phoneNumber à null avant de renvoyer l'objet
        club.setPhoneNumber(null);
        return club;
    }

    public ClubDTO updateClub(String id, ClubUpdateDTO dto, MultipartFile image) {
        logger.info("Updating club",
                keyValue("action", "update_club"),
                keyValue("club_id", id),
                keyValue("has_image", image != null),
                keyValue("club_name", dto != null ? dto.getName() : null));
        return clubClientService.updateClub(id, dto, image);
    }
}