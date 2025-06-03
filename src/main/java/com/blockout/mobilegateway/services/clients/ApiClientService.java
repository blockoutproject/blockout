package com.blockout.mobilegateway.services.clients;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ApiClientService {

    private static final Logger logger = LoggerFactory.getLogger(ApiClientService.class);

    private final RestTemplate restTemplate;

    public <T> ResponseEntity<T> get(String url, Class<T> responseType) {
        logger.info("Performing GET request",
                keyValue("action", "external_api_get"),
                keyValue("url", url),
                keyValue("responseType", responseType.getSimpleName()));

        try {
            ResponseEntity<T> response = restTemplate.exchange(url, HttpMethod.GET, null, responseType);

            logger.info("GET request successful",
                    keyValue("status", response.getStatusCode()),
                    keyValue("url", url));

            return response;
        } catch (Exception ex) {
            logger.error("GET request failed",
                    keyValue("url", url),
                    keyValue("error", ex.getMessage()),
                    ex);
            throw ex;
        }
    }

    public <T, B> ResponseEntity<T> post(String url, B body, Class<T> responseType) {
        logger.info("Performing POST request",
                keyValue("action", "external_api_post"),
                keyValue("url", url),
                keyValue("bodyType", body.getClass().getSimpleName()),
                keyValue("responseType", responseType.getSimpleName()));

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<B> request = new HttpEntity<>(body, headers);

            ResponseEntity<T> response = restTemplate.exchange(url, HttpMethod.POST, request, responseType);

            logger.info("POST request successful",
                    keyValue("status", response.getStatusCode()),
                    keyValue("url", url));

            return response;
        } catch (Exception ex) {
            logger.error("POST request failed",
                    keyValue("url", url),
                    keyValue("error", ex.getMessage()),
                    ex);
            throw ex;
        }
    }
}