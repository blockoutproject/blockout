package com.blockout.notifications.services.clients;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ApiClientService {

    private static final Logger logger = LoggerFactory.getLogger(ApiClientService.class);

    @Qualifier("forwardRestTemplate")
    private final RestTemplate forwardRt;

    @Qualifier("serviceRestTemplate")
    private final RestTemplate serviceRt;

    public <T> ResponseEntity<T> getForward(String url, Class<T> responseType) {
        return doGet(url, responseType, forwardRt, "forward");
    }

    public <T, B> ResponseEntity<T> postForward(String url, B body, Class<T> responseType) {
        return doPost(url, body, responseType, forwardRt, "forward");
    }

    public <T> ResponseEntity<T> getService(String url, Class<T> responseType) {
        return doGet(url, responseType, serviceRt, "service");
    }

    public <T, B> ResponseEntity<T> postService(String url, B body, Class<T> responseType) {
        return doPost(url, body, responseType, serviceRt, "service");
    }

    private <T> ResponseEntity<T> doGet(String url, Class<T> responseType, RestTemplate rt, String mode) {
        logger.info("Performing external GET request",
                keyValue("action", "external_api_get"),
                keyValue("mode", mode),
                keyValue("url", url),
                keyValue("responseType", responseType.getSimpleName()));
        try {
            ResponseEntity<T> response = rt.exchange(url, HttpMethod.GET, null, responseType);
            logger.info("GET request successful",
                    keyValue("status", response.getStatusCode()),
                    keyValue("mode", mode),
                    keyValue("url", url));
            return response;

        } catch (HttpClientErrorException e) {
            logger.warn("Client error during GET request",
                    keyValue("url", url),
                    keyValue("mode", mode),
                    keyValue("status", e.getStatusCode()),
                    keyValue("message", e.getMessage()));
            throw e;
        } catch (Exception e) {
            logger.error("GET request failed",
                    keyValue("url", url),
                    keyValue("mode", mode),
                    keyValue("message", e.getMessage()), e);
            throw new RuntimeException("GET request failed for " + url, e);
        }
    }

    private <T, B> ResponseEntity<T> doPost(String url, B body, Class<T> responseType, RestTemplate rt, String mode) {
        logger.info("Performing external POST request",
                keyValue("action", "external_api_post"),
                keyValue("mode", mode),
                keyValue("url", url),
                keyValue("bodyType", body != null ? body.getClass().getSimpleName() : "null"),
                keyValue("responseType", responseType.getSimpleName()));
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<B> request = new HttpEntity<>(body, headers);

            ResponseEntity<T> response = rt.exchange(url, HttpMethod.POST, request, responseType);
            logger.info("POST request successful",
                    keyValue("status", response.getStatusCode()),
                    keyValue("mode", mode),
                    keyValue("url", url));
            return response;

        } catch (HttpClientErrorException e) {
            logger.warn("Client error during POST request",
                    keyValue("url", url),
                    keyValue("mode", mode),
                    keyValue("status", e.getStatusCode()),
                    keyValue("message", e.getMessage()));
            throw e;
        } catch (Exception e) {
            logger.error("POST request failed",
                    keyValue("url", url),
                    keyValue("mode", mode),
                    keyValue("message", e.getMessage()), e);
            throw new RuntimeException("POST request failed for " + url, e);
        }
    }
}