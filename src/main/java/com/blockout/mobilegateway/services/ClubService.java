package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.models.dto.club.ClubDTO;
import com.blockout.mobilegateway.models.dto.club.ClubUpdateDTO;
import com.blockout.mobilegateway.services.clients.ClubClientService;
import lombok.RequiredArgsConstructor;

import java.util.logging.Logger;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class ClubService {

    Logger logger = Logger.getLogger(ClubService.class.getName());

    private final ClubClientService clubClientService;

    public ClubDTO getClubById(String id) {
        logger.info("Fetching club id=" + id);
        return clubClientService.getClubById(id);
    }

    public ClubDTO updateClub(String id, ClubUpdateDTO dto, MultipartFile image) {
        logger.info("Updating club with id: " + id);
        return clubClientService.updateClub(id, dto, image);
    }
}