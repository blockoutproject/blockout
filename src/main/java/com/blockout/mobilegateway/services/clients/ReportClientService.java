package com.blockout.mobilegateway.services.clients;

import com.blockout.mobilegateway.config.ApiClientProperties;
import com.blockout.mobilegateway.models.dto.report.GitHubIssueResponseDTO;
import com.blockout.mobilegateway.models.dto.report.ReportCreateDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@Service
@RequiredArgsConstructor
public class ReportClientService {

    private static final Logger logger = LoggerFactory.getLogger(ReportClientService.class);

    private final ApiClientProperties apiClientProperties;
    private final ApiClientService apiClientService;
    private final ObjectMapper objectMapper;

    private String baseUrl() {
        return apiClientProperties.getReport().getUrl();
    }

    public GitHubIssueResponseDTO createReport(ReportCreateDTO dto, List<MultipartFile> images) {
        String url = baseUrl();
        logger.info("Calling reports#create", keyValue("url", url));

        final String jsonString;
        try {
            jsonString = objectMapper.writeValueAsString(dto);
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