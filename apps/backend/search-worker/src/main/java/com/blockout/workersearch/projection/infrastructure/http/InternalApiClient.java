package com.blockout.workersearch.projection.infrastructure.http;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

@Component
@RequiredArgsConstructor
public class InternalApiClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(InternalApiClient.class);

    private final RestTemplate restTemplate;

    public <T> ResponseEntity<T> get(String url, Class<T> responseType) {
        LOGGER.info(
                "Performing internal GET request",
                keyValue("action", "internal_api_get"),
                keyValue("url", url),
                keyValue("responseType", responseType.getSimpleName()));
        try {
            return restTemplate.exchange(url, HttpMethod.GET, null, responseType);
        } catch (HttpClientErrorException exception) {
            LOGGER.warn(
                    "Client error during internal GET request",
                    keyValue("url", url),
                    keyValue("status", exception.getStatusCode()),
                    keyValue("message", exception.getMessage()));
            throw exception;
        } catch (Exception exception) {
            LOGGER.error("Internal GET request failed", keyValue("url", url), exception);
            throw new RuntimeException("GET request failed for " + url, exception);
        }
    }
}
