package com.blockout.workersearch.projection.infrastructure.http;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

/**
 * Loads internal projection snapshots for the search worker.
 */
@Component
@RequiredArgsConstructor
public class InternalApiClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(InternalApiClient.class);

    private final RestTemplate restTemplate;

    /**
     * Executes an internal GET request without exposing its URL in logs.
     *
     * @param url internal endpoint.
     * @param responseType expected response type.
     * @return downstream response.
     */
    public <T> ResponseEntity<T> get(String url, Class<T> responseType) {
        LOGGER.debug(
            "Performing internal GET request",
            keyValue("action", "internal_api_get"),
            keyValue("responseType", responseType.getSimpleName()));
        try {
            return restTemplate.exchange(url, HttpMethod.GET, null, responseType);
        } catch (HttpClientErrorException exception) {
            LOGGER.warn(
                "Client error during internal GET request",
                keyValue("status", exception.getStatusCode()));
            throw exception;
        } catch (Exception exception) {
            LOGGER.error("Internal GET request failed", exception);
            throw new RuntimeException("Internal GET request failed", exception);
        }
    }
}
