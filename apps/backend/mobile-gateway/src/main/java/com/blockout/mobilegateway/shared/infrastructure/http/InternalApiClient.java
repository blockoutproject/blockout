package com.blockout.mobilegateway.shared.infrastructure.http;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestTemplate;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

/**
 * Executes authenticated calls from the mobile gateway to internal services.
 */
@Service
public class InternalApiClient {

    private static final Logger logger = LoggerFactory.getLogger(InternalApiClient.class);

    private final RestTemplate withUser;
    private final RestTemplate withM2M;

    /**
     * Creates an internal API client with user-forwarding and service-authenticated transports.
     *
     * @param withUser transport forwarding the current user token.
     * @param withM2M transport using service credentials.
     */
    public InternalApiClient(
        @Qualifier("internalAuthRestTemplate") RestTemplate withUser,
        @Qualifier("internalM2MRestTemplate") RestTemplate withM2M) {
        this.withUser = withUser;
        this.withM2M = withM2M;
    }

    private boolean hasUserJwt() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        return (a instanceof JwtAuthenticationToken) && a.isAuthenticated();
    }

    private RestTemplate pickRt() {
        return hasUserJwt() ? withUser : withM2M;
    }

    private String mode() {
        return hasUserJwt() ? "user_forward" : "m2m_dumb";
    }

    /**
     * Executes an internal GET request.
     *
     * @param url internal endpoint.
     * @param responseType expected response type.
     * @return downstream response.
     */
    public <T> ResponseEntity<T> get(String url, Class<T> responseType) {
        String chosen = mode();
        logger.debug("Performing internal GET request",
            keyValue("action", "external_api_get"),
            keyValue("responseType", responseType.getSimpleName()),
            keyValue("auth_mode", chosen));

        try {
            ResponseEntity<T> response = pickRt().exchange(url, HttpMethod.GET, null, responseType);
            logger.debug("Internal GET request successful",
                keyValue("status", response.getStatusCode()),
                keyValue("auth_mode", chosen));
            return response;

        } catch (HttpClientErrorException e) {
            logger.warn("Client error during GET request",
                keyValue("status", e.getStatusCode()),
                keyValue("auth_mode", chosen));
            throw e;
        } catch (Exception e) {
            logger.error("GET request failed",
                keyValue("auth_mode", chosen), e);
            throw new RuntimeException("Internal GET request failed", e);
        }
    }

    /**
     * Executes an internal JSON POST request.
     *
     * @param url internal endpoint.
     * @param body request body.
     * @param responseType expected response type.
     * @return downstream response.
     */
    public <T, B> ResponseEntity<T> post(String url, B body, Class<T> responseType) {
        String chosen = mode();
        logger.debug("Performing internal POST request",
            keyValue("action", "external_api_post"),
            keyValue("bodyType", body != null ? body.getClass().getSimpleName() : "null"),
            keyValue("responseType", responseType.getSimpleName()),
            keyValue("auth_mode", chosen));

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));
            HttpEntity<B> request = new HttpEntity<>(body, headers);

            ResponseEntity<T> response = pickRt().exchange(url, HttpMethod.POST, request, responseType);
            logger.debug("Internal POST request successful",
                keyValue("status", response.getStatusCode()),
                keyValue("auth_mode", chosen));
            return response;

        } catch (HttpClientErrorException | HttpServerErrorException e) {
            logger.error("POST upstream error",
                keyValue("status", e.getStatusCode()),
                keyValue("auth_mode", chosen), e);
            throw e;
        } catch (Exception e) {
            logger.error("POST request failed",
                keyValue("auth_mode", chosen), e);
            throw new RuntimeException("Internal POST request failed", e);
        }
    }

    /**
     * Executes an internal JSON PUT request.
     *
     * @param url internal endpoint.
     * @param body request body.
     * @param responseType expected response type.
     * @return downstream response.
     */
    public <T, B> ResponseEntity<T> put(String url, B body, Class<T> responseType) {
        String chosen = mode();
        logger.debug("Performing internal PUT request",
            keyValue("action", "external_api_put"),
            keyValue("bodyType", body != null ? body.getClass().getSimpleName() : "null"),
            keyValue("responseType", responseType.getSimpleName()),
            keyValue("auth_mode", chosen));
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));
            HttpEntity<B> request = new HttpEntity<>(body, headers);

            ResponseEntity<T> response = pickRt().exchange(url, HttpMethod.PUT, request, responseType);
            logger.debug("Internal PUT request successful",
                keyValue("status", response.getStatusCode()),
                keyValue("auth_mode", chosen));
            return response;

        } catch (HttpClientErrorException | HttpServerErrorException e) {
            logger.error("PUT upstream error",
                keyValue("status", e.getStatusCode()),
                keyValue("auth_mode", chosen), e);
            throw e;
        } catch (Exception e) {
            logger.error("PUT request failed",
                keyValue("auth_mode", chosen), e);
            throw new RuntimeException("Internal PUT request failed", e);
        }
    }

    /**
     * Executes an internal multipart PUT request.
     *
     * @param url internal endpoint.
     * @param multipartBody multipart fields.
     * @param responseType expected response type.
     * @return downstream response.
     */
    public <T> ResponseEntity<T> putMultipart(String url,
                                              MultiValueMap<String, Object> multipartBody,
                                              Class<T> responseType) {
        String chosen = mode();
        logger.debug("Performing internal PUT multipart request",
            keyValue("action", "external_api_put_multipart"),
            keyValue("responseType", responseType.getSimpleName()),
            keyValue("auth_mode", chosen));

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(multipartBody, headers);
            ResponseEntity<T> response = pickRt().exchange(url, HttpMethod.PUT, request, responseType);

            logger.debug("Internal PUT multipart request successful",
                keyValue("status", response.getStatusCode()),
                keyValue("auth_mode", chosen));
            return response;

        } catch (HttpClientErrorException | HttpServerErrorException e) {
            logger.error("PUT multipart upstream error",
                keyValue("status", e.getStatusCode()),
                keyValue("auth_mode", chosen), e);
            throw e;
        } catch (Exception e) {
            logger.error("PUT multipart request failed",
                keyValue("auth_mode", chosen), e);
            throw new RuntimeException("Internal PUT multipart request failed", e);
        }
    }

    /**
     * Executes an internal DELETE request.
     *
     * @param url internal endpoint.
     * @param responseType expected response type.
     * @return downstream response.
     */
    public <T> ResponseEntity<T> delete(String url, Class<T> responseType) {
        String chosen = mode();
        logger.debug("Performing internal DELETE request",
            keyValue("action", "external_api_delete"),
            keyValue("responseType", responseType.getSimpleName()),
            keyValue("auth_mode", chosen));
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));
            HttpEntity<Void> request = new HttpEntity<>(headers);

            ResponseEntity<T> response = pickRt().exchange(url, HttpMethod.DELETE, request, responseType);
            logger.debug("Internal DELETE request successful",
                keyValue("status", response.getStatusCode()),
                keyValue("auth_mode", chosen));
            return response;

        } catch (HttpClientErrorException | HttpServerErrorException e) {
            logger.error("DELETE upstream error",
                keyValue("status", e.getStatusCode()),
                keyValue("auth_mode", chosen), e);
            throw e;
        } catch (Exception e) {
            logger.error("DELETE request failed",
                keyValue("auth_mode", chosen), e);
            throw new RuntimeException("Internal DELETE request failed", e);
        }
    }

    /**
     * Executes an internal multipart POST request.
     *
     * @param url internal endpoint.
     * @param multipartBody multipart fields.
     * @param responseType expected response type.
     * @return downstream response.
     */
    public <T> ResponseEntity<T> postMultipart(
        String url,
        MultiValueMap<String, Object> multipartBody,
        Class<T> responseType) {
        String chosen = mode();
        logger.debug("Performing internal POST multipart request",
            keyValue("action", "external_api_post_multipart"),
            keyValue("responseType", responseType.getSimpleName()),
            keyValue("auth_mode", chosen));

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(multipartBody, headers);
            ResponseEntity<T> response = pickRt().exchange(url, HttpMethod.POST, request, responseType);

            logger.debug("Internal POST multipart request successful",
                keyValue("status", response.getStatusCode()),
                keyValue("auth_mode", chosen));
            return response;

        } catch (HttpClientErrorException | HttpServerErrorException e) {
            logger.error("POST multipart upstream error",
                keyValue("status", e.getStatusCode()),
                keyValue("auth_mode", chosen), e);
            throw e;
        } catch (Exception e) {
            logger.error("POST multipart request failed",
                keyValue("auth_mode", chosen), e);
            throw new RuntimeException("Internal POST multipart request failed", e);
        }
    }
}
