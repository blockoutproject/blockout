package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.report.GitHubIssueResponseDTO;
import com.blockout.mobilegateway.models.dto.report.ReportCreateDTO;
import com.blockout.mobilegateway.shared.api.v1.LegacyMobileGatewayJson;
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
public class ReportClientService {

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;
    private final LegacyMobileGatewayJson legacyJson;

    private String baseUrl() {
        return apiClientProperties.getReport().getUrl();
    }

    public GitHubIssueResponseDTO createReport(ReportCreateDTO dto, List<MultipartFile> images) {
        String url = baseUrl();

        final String jsonString;
        try {
            jsonString = legacyJson.write(dto);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize ReportCreateDTO", e);
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

        ResponseEntity<GitHubIssueResponseDTO> response =
                apiClientService.postMultipart(url, body, GitHubIssueResponseDTO.class);
        return response.getBody();
    }
}
