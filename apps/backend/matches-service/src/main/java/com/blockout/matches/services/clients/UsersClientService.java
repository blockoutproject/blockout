package com.blockout.matches.services.clients;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.blockout.matches.config.ApiClientProperties;
import com.blockout.matches.models.dto.users.CustomUserDTO;

@Service
@RequiredArgsConstructor
public class UsersClientService {

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    public CustomUserDTO getCurrentUser() {
        String url = apiClientProperties.getUser().getUrl() + "/me";

        ResponseEntity<CustomUserDTO> response = apiClientService.getForward(url, CustomUserDTO.class);
        return response.getBody();
    }
}