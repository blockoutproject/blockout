package com.blockout.notifications.notification.infrastructure.http;

import com.blockout.notifications.config.ApiClientProperties;
import com.blockout.notifications.notification.application.views.PoolNotificationView;
import com.blockout.notifications.notification.infrastructure.http.contract.pool.models.PoolInternalResponse;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

/** Reads pool notification data from the authoritative internal Pool API. */
@Service
@RequiredArgsConstructor
public class PoolHttpClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient apiClientService;

    /**
     * Reads the pool display data needed by notification composition.
     *
     * @param id pool identifier.
     * @return notification projection, or {@code null} when the downstream response has no body.
     */
    public PoolNotificationView getPoolById(Long id) {
        String url = apiClientProperties.getPool().getUrl() + "/" + id;

        ResponseEntity<PoolInternalResponse> response = apiClientService.getService(url, PoolInternalResponse.class);
        PoolInternalResponse pool = response.getBody();
        return pool == null ? null : new PoolNotificationView(pool.getName(), pool.getDivisionId());
    }
}
