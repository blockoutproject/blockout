package com.blockout.mobilegateway.report.infrastructure;

import com.blockout.mobilegateway.shared.infrastructure.http.InternalApiClient;
import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.report.api.models.ReportResponse;
import com.blockout.mobilegateway.report.api.models.CreateReportRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReportInternalClient {

    private final ApiClientProperties apiClientProperties;
    private final InternalApiClient internalApiClient;
    private final ObjectMapper objectMapper;

    private String baseUrl() {
        return apiClientProperties.getReport().getUrl();
    }

    public ReportResponse createReport(CreateReportRequest dto, List<MultipartFile> images) {
        String url = baseUrl();

        final String jsonString;
        try {
            jsonString = objectMapper.writeValueAsString(dto);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize CreateReportRequest", e);
        }

        HttpHeaders jsonHeaders = new HttpHeaders();
        jsonHeaders.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> dataPart = new HttpEntity<>(jsonString, jsonHeaders);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("data", dataPart);

        if (images != null && !images.isEmpty()) {
            for (MultipartFile image : images) {
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
                    HttpEntity<ByteArrayResource> imagePart = new HttpEntity<>(resource, imgHeaders);
                    body.add("images", imagePart);
                } catch (Exception e) {
                    throw new RuntimeException("Failed to read image payload", e);
                }
            }
        }

        ResponseEntity<ReportResponse> response =
                internalApiClient.postMultipart(url, body, ReportResponse.class);
        return response.getBody();
    }
}
