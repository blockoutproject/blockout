package com.blockout.notifications.notification.infrastructure.http;

import com.blockout.notifications.config.ApiClientProperties;
import com.blockout.notifications.notification.infrastructure.http.models.PoolInternalResponse;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class PoolHttpClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient apiClientService;

    public PoolInternalResponse getPoolById(Long id) {
        String url = apiClientProperties.getPool().getUrl() + "/" + id;

        ResponseEntity<PoolInternalResponse> response = apiClientService.getService(url, PoolInternalResponse.class);
        return response.getBody();
    }
}
