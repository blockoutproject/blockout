package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.club.ClubDTO;
import com.blockout.mobilegateway.models.dto.club.ClubUpdateDTO;
import com.blockout.mobilegateway.services.utils.MultipartBodyBuilder;
import com.blockout.mobilegateway.shared.api.v1.LegacyMobileGatewayJson;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriComponentsBuilder;

@Service
@RequiredArgsConstructor
public class ClubClientService {

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;
    private final LegacyMobileGatewayJson legacyJson;

    private String baseUrl() {
        return apiClientProperties.getClub().getUrl();
    }

    @Cacheable(value = "clubById", key = "#id")
    public ClubDTO getClubById(String id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id)
                .build().toUriString();

        ResponseEntity<ClubDTO> response = apiClientService.get(url, ClubDTO.class);
        return response.getBody();
    }

    @Cacheable(value = "clubLogoById", key = "#id")
    public String getClubLogoUrl(String id) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id, "logo")
                .build().toUriString();

        ResponseEntity<String> response = apiClientService.get(url, String.class);
        String body = response.getBody();

        return (response.getStatusCode() == HttpStatus.NO_CONTENT || body == null || body.isBlank()) ? null : body;
    }

    @Caching(put = {
            @CachePut(value = "clubById", key = "#id")
    }, evict = {
            @CacheEvict(value = "clubLogoById", key = "#id")
    })
    public ClubDTO updateClub(String id, ClubUpdateDTO dto, MultipartFile image) {
        String url = UriComponentsBuilder.fromUriString(baseUrl())
                .pathSegment(id)
                .build().toUriString();

        MultiValueMap<String, Object> body = MultipartBodyBuilder.buildMultipart(legacyJson, dto, image);

        ResponseEntity<ClubDTO> response = apiClientService.putMultipart(url, body, ClubDTO.class);
        return response.getBody();
    }
}
