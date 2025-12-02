package com.blockout.notifications.services.clients;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import com.blockout.notifications.config.ApiClientProperties;
import com.blockout.notifications.models.dto.users.CustomUserDTO;

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