package com.blockout.notifications.notification.infrastructure.http;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

/**
 * Executes notification-service calls to internal APIs with the required authentication mode.
 */
@Service
public class InternalApiClient {

    private static final Logger logger = LoggerFactory.getLogger(InternalApiClient.class);

    private final RestTemplate forwardRt;
    private final RestTemplate serviceRt;

    public InternalApiClient(
        @Qualifier("forwardRestTemplate") RestTemplate forwardRt,
        @Qualifier("serviceRestTemplate") RestTemplate serviceRt) {
        this.forwardRt = forwardRt;
        this.serviceRt = serviceRt;
    }

    /**
     * Executes a GET request while forwarding the user authentication.
     *
     * @param url internal endpoint.
     * @param responseType expected response type.
     * @return downstream response.
     */
    public <T> ResponseEntity<T> getForward(String url, Class<T> responseType) {
        return doGet(url, responseType, forwardRt, "forward");
    }

    /**
     * Executes a POST request while forwarding the user authentication.
     *
     * @param url internal endpoint.
     * @param body request body.
     * @param responseType expected response type.
     * @return downstream response.
     */
    public <T, B> ResponseEntity<T> postForward(String url, B body, Class<T> responseType) {
        return doPost(url, body, responseType, forwardRt, "forward");
    }

    /**
     * Executes a service-authenticated GET request.
     *
     * @param url internal endpoint.
     * @param responseType expected response type.
     * @return downstream response.
     */
    public <T> ResponseEntity<T> getService(String url, Class<T> responseType) {
        return doGet(url, responseType, serviceRt, "service");
    }

    /**
     * Executes a service-authenticated POST request.
     *
     * @param url internal endpoint.
     * @param body request body.
     * @param responseType expected response type.
     * @return downstream response.
     */
    public <T, B> ResponseEntity<T> postService(String url, B body, Class<T> responseType) {
        return doPost(url, body, responseType, serviceRt, "service");
    }

    private <T> ResponseEntity<T> doGet(String url, Class<T> responseType, RestTemplate rt, String mode) {
        logger.debug("Performing internal GET request",
            keyValue("action", "external_api_get"),
            keyValue("mode", mode),
            keyValue("responseType", responseType.getSimpleName()));
        try {
            ResponseEntity<T> response = rt.exchange(url, HttpMethod.GET, null, responseType);
            logger.debug("Internal GET request successful",
                keyValue("status", response.getStatusCode()),
                keyValue("mode", mode));
            return response;
        } catch (HttpClientErrorException e) {
            logger.warn("Client error during GET request",
                keyValue("mode", mode),
                keyValue("status", e.getStatusCode()));
            throw e;
        } catch (Exception e) {
            logger.error("GET request failed",
                keyValue("mode", mode),
                e);
            throw new RuntimeException("Internal GET request failed", e);
        }
    }

    private <T, B> ResponseEntity<T> doPost(String url, B body, Class<T> responseType, RestTemplate rt, String mode) {
        logger.debug("Performing internal POST request",
            keyValue("action", "external_api_post"),
            keyValue("mode", mode),
            keyValue("bodyType", body != null ? body.getClass().getSimpleName() : "null"),
            keyValue("responseType", responseType.getSimpleName()));
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<B> request = new HttpEntity<>(body, headers);

            ResponseEntity<T> response = rt.exchange(url, HttpMethod.POST, request, responseType);
            logger.debug("Internal POST request successful",
                keyValue("status", response.getStatusCode()),
                keyValue("mode", mode));
            return response;

        } catch (HttpClientErrorException e) {
            logger.warn("Client error during POST request",
                keyValue("mode", mode),
                keyValue("status", e.getStatusCode()));
            throw e;
        } catch (Exception e) {
            logger.error("POST request failed",
                keyValue("mode", mode),
                e);
            throw new RuntimeException("Internal POST request failed", e);
        }
    }
}
