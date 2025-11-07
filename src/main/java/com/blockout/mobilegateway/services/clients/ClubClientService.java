package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.club.ClubDTO;
import com.blockout.mobilegateway.models.dto.club.ClubUpdateDTO;
import com.blockout.mobilegateway.services.utils.MultipartBodyBuilder;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.*;
import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ClubClientService {

    private static final Logger logger = LoggerFactory.getLogger(ClubClientService.class);

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;
    private final ObjectMapper objectMapper;

    private String baseUrl() {
        return apiClientProperties.getClub().getUrl();
    }

    public ClubDTO getClubById(String id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id)
                .build().toUriString();

        logger.info("Calling clubs#getById", keyValue("id", id), keyValue("url", url));

        ResponseEntity<ClubDTO> response = apiClientService.get(url, ClubDTO.class);
        return response.getBody();
    }

    public String getClubLogoUrl(String id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id, "logo")
                .build().toUriString();

        logger.info("Calling clubs#getLogo", keyValue("id", id), keyValue("url", url));

        ResponseEntity<String> response = apiClientService.get(url, String.class);
        String body = response.getBody();

        return (response.getStatusCode() == HttpStatus.NO_CONTENT || body == null || body.isBlank()) ? null : body;
    }

    public List<ClubDTO> getClubsByIds(Set<String> ids) {
        if (ids == null || ids.isEmpty())
            return Collections.emptyList();

        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .queryParam("ids", ids)
                .build().toUriString();

        logger.info("Calling clubs#getByIds", keyValue("ids", ids), keyValue("url", url));

        ResponseEntity<ClubDTO[]> response = apiClientService.get(url, ClubDTO[].class);
        return Optional.ofNullable(response.getBody()).map(Arrays::asList).orElse(Collections.emptyList());
    }

    public ClubDTO updateClub(String id, ClubUpdateDTO dto, MultipartFile image) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id)
                .build().toUriString();

        logger.info("Calling clubs#update", keyValue("id", id), keyValue("url", url));

        MultiValueMap<String, Object> body = MultipartBodyBuilder.buildMultipart(objectMapper, dto, image);

        ResponseEntity<ClubDTO> response = apiClientService.putMultipart(url, body, ClubDTO.class);
        return response.getBody();
    }
}