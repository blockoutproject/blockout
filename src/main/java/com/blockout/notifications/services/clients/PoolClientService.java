package com.blockout.notifications.services.clients;

import com.blockout.notifications.config.ApiClientProperties;
import com.blockout.notifications.models.dto.pool.PoolDTO;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PoolClientService {

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;

    public PoolDTO getPoolById(Long id) {
        String url = apiClientProperties.getPool().getUrl() + "/" + id;

        ResponseEntity<PoolDTO> response = apiClientService.getService(url, PoolDTO.class);
        return response.getBody();
    }
}