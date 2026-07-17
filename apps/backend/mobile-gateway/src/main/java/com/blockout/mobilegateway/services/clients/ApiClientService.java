package com.blockout.mobilegateway.services.clients;

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

@Service
public class ApiClientService {

    private static final Logger logger = LoggerFactory.getLogger(ApiClientService.class);

    private final RestTemplate withUser;
    private final RestTemplate withM2M;

    public ApiClientService(
            @Qualifier("legacyInternalAuthRestTemplate") RestTemplate withUser,
            @Qualifier("legacyInternalM2MRestTemplate") RestTemplate withM2M) {
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

    public <T> ResponseEntity<T> get(String url, Class<T> responseType) {
        String chosen = mode();
        logger.info("Performing external GET request",
                keyValue("action", "external_api_get"),
                keyValue("url", url),
                keyValue("responseType", responseType.getSimpleName()),
                keyValue("auth_mode", chosen));

        try {
            ResponseEntity<T> response = pickRt().exchange(url, HttpMethod.GET, null, responseType);
            logger.info("GET request successful",
                    keyValue("status", response.getStatusCode()),
                    keyValue("url", url),
                    keyValue("auth_mode", chosen));
            return response;

        } catch (HttpClientErrorException e) {
            logger.warn("Client error during GET request",
                    keyValue("url", url),
                    keyValue("status", e.getStatusCode()),
                    keyValue("auth_mode", chosen));
            throw e;
        } catch (Exception e) {
            logger.error("GET request failed",
                    keyValue("url", url),
                    keyValue("message", e.getMessage()),
                    keyValue("auth_mode", chosen), e);
            throw new RuntimeException("GET request failed for " + url, e);
        }
    }

    public <T, B> ResponseEntity<T> post(String url, B body, Class<T> responseType) {
        String chosen = mode();
        logger.info("Performing external POST request",
                keyValue("action", "external_api_post"),
                keyValue("url", url),
                keyValue("bodyType", body != null ? body.getClass().getSimpleName() : "null"),
                keyValue("responseType", responseType.getSimpleName()),
                keyValue("auth_mode", chosen));

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));
            HttpEntity<B> request = new HttpEntity<>(body, headers);

            ResponseEntity<T> response = pickRt().exchange(url, HttpMethod.POST, request, responseType);
            logger.info("POST request successful",
                    keyValue("status", response.getStatusCode()),
                    keyValue("url", url),
                    keyValue("auth_mode", chosen));
            return response;

        } catch (HttpClientErrorException | HttpServerErrorException e) {
            logger.error("POST upstream error",
                    keyValue("url", url),
                    keyValue("status", e.getStatusCode()),
                    keyValue("auth_mode", chosen), e);
            throw e;
        } catch (Exception e) {
            logger.error("POST request failed",
                    keyValue("url", url),
                    keyValue("message", e.getMessage()),
                    keyValue("auth_mode", chosen), e);
            throw new RuntimeException("POST request failed for " + url, e);
        }
    }

    public <T, B> ResponseEntity<T> put(String url, B body, Class<T> responseType) {
        String chosen = mode();
        logger.info("Performing external PUT request",
                keyValue("action", "external_api_put"),
                keyValue("url", url),
                keyValue("bodyType", body != null ? body.getClass().getSimpleName() : "null"),
                keyValue("responseType", responseType.getSimpleName()),
                keyValue("auth_mode", chosen));
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));
            HttpEntity<B> request = new HttpEntity<>(body, headers);

            ResponseEntity<T> response = pickRt().exchange(url, HttpMethod.PUT, request, responseType);
            logger.info("PUT request successful",
                    keyValue("status", response.getStatusCode()),
                    keyValue("url", url),
                    keyValue("auth_mode", chosen));
            return response;

        } catch (HttpClientErrorException | HttpServerErrorException e) {
            logger.error("PUT upstream error",
                    keyValue("url", url),
                    keyValue("status", e.getStatusCode()),
                    keyValue("auth_mode", chosen), e);
            throw e;
        } catch (Exception e) {
            logger.error("PUT request failed",
                    keyValue("url", url),
                    keyValue("message", e.getMessage()),
                    keyValue("auth_mode", chosen), e);
            throw new RuntimeException("PUT request failed for " + url, e);
        }
    }

    public <T> ResponseEntity<T> putMultipart(String url,
            MultiValueMap<String, Object> multipartBody,
            Class<T> responseType) {
        String chosen = mode();
        logger.info("Performing external PUT multipart request",
                keyValue("action", "external_api_put_multipart"),
                keyValue("url", url),
                keyValue("responseType", responseType.getSimpleName()),
                keyValue("auth_mode", chosen));

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(multipartBody, headers);
            ResponseEntity<T> response = pickRt().exchange(url, HttpMethod.PUT, request, responseType);

            logger.info("PUT multipart request successful",
                    keyValue("status", response.getStatusCode()),
                    keyValue("url", url),
                    keyValue("auth_mode", chosen));
            return response;

        } catch (HttpClientErrorException | HttpServerErrorException e) {
            logger.error("PUT multipart upstream error",
                    keyValue("url", url),
                    keyValue("status", e.getStatusCode()),
                    keyValue("auth_mode", chosen), e);
            throw e;
        } catch (Exception e) {
            logger.error("PUT multipart request failed",
                    keyValue("url", url),
                    keyValue("message", e.getMessage()),
                    keyValue("auth_mode", chosen), e);
            throw new RuntimeException("PUT multipart request failed for " + url, e);
        }
    }

    public <T> ResponseEntity<T> delete(String url, Class<T> responseType) {
        String chosen = mode();
        logger.info("Performing external DELETE request",
                keyValue("action", "external_api_delete"),
                keyValue("url", url),
                keyValue("responseType", responseType.getSimpleName()),
                keyValue("auth_mode", chosen));
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setAccept(java.util.List.of(MediaType.APPLICATION_JSON));
            HttpEntity<Void> request = new HttpEntity<>(headers);

            ResponseEntity<T> response = pickRt().exchange(url, HttpMethod.DELETE, request, responseType);
            logger.info("DELETE request successful",
                    keyValue("status", response.getStatusCode()),
                    keyValue("url", url),
                    keyValue("auth_mode", chosen));
            return response;

        } catch (HttpClientErrorException | HttpServerErrorException e) {
            logger.error("DELETE upstream error",
                    keyValue("url", url),
                    keyValue("status", e.getStatusCode()),
                    keyValue("auth_mode", chosen), e);
            throw e;
        } catch (Exception e) {
            logger.error("DELETE request failed",
                    keyValue("url", url),
                    keyValue("message", e.getMessage()),
                    keyValue("auth_mode", chosen), e);
            throw new RuntimeException("DELETE request failed for " + url, e);
        }
    }

    public <T> ResponseEntity<T> postMultipart(
            String url,
            MultiValueMap<String, Object> multipartBody,
            Class<T> responseType) {
        String chosen = mode();
        logger.info("Performing external POST multipart request",
                keyValue("action", "external_api_post_multipart"),
                keyValue("url", url),
                keyValue("responseType", responseType.getSimpleName()),
                keyValue("auth_mode", chosen));

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(multipartBody, headers);
            ResponseEntity<T> response = pickRt().exchange(url, HttpMethod.POST, request, responseType);

            logger.info("POST multipart request successful",
                    keyValue("status", response.getStatusCode()),
                    keyValue("url", url),
                    keyValue("auth_mode", chosen));
            return response;

        } catch (HttpClientErrorException | HttpServerErrorException e) {
            logger.error("POST multipart upstream error",
                    keyValue("url", url),
                    keyValue("status", e.getStatusCode()),
                    keyValue("auth_mode", chosen), e);
            throw e;
        } catch (Exception e) {
            logger.error("POST multipart request failed",
                    keyValue("url", url),
                    keyValue("message", e.getMessage()),
                    keyValue("auth_mode", chosen), e);
            throw new RuntimeException("POST multipart request failed for " + url, e);
        }
    }
}
