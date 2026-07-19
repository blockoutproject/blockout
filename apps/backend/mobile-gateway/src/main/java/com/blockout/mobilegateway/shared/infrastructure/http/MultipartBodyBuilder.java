package com.blockout.mobilegateway.shared.infrastructure.http;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.experimental.UtilityClass;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;

@UtilityClass
public class MultipartBodyBuilder {

    /** Builds a multipart request with a JSON data part and an optional image. */
    public static <T> MultiValueMap<String, Object> buildMultipart(
            ObjectMapper objectMapper,
            T dto,
            MultipartFile image) {

        final String jsonString;
        try {
            jsonString = objectMapper.writeValueAsString(dto);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize request payload to JSON", e);
        }

        HttpHeaders jsonHeaders = new HttpHeaders();
        jsonHeaders.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> dataPart = new HttpEntity<>(jsonString, jsonHeaders);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("data", dataPart);

        if (image != null && !image.isEmpty()) {
            try {
                ByteArrayResource resource = new ByteArrayResource(image.getBytes()) {
                    @Override
                    public String getFilename() {
                        return image.getOriginalFilename() != null ? image.getOriginalFilename() : "image";
                    }
                };
                HttpHeaders imgHeaders = new HttpHeaders();
                imgHeaders.setContentType(MediaType.parseMediaType(
                        image.getContentType() != null ? image.getContentType() : MediaType.APPLICATION_OCTET_STREAM_VALUE));
                body.add("image", new HttpEntity<>(resource, imgHeaders));
            } catch (Exception e) {
                throw new RuntimeException("Failed to read image payload", e);
            }
        }

        return body;
    }
}
