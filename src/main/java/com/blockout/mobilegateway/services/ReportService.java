package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.models.dto.report.GitHubIssueResponseDTO;
import com.blockout.mobilegateway.models.dto.report.ReportCreateDTO;
import com.blockout.mobilegateway.services.clients.ReportClientService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.logging.Logger;

@Service
@RequiredArgsConstructor
public class ReportService {

    private static final Logger logger = Logger.getLogger(ReportService.class.getName());
    private final ReportClientService reportClientService;

    public GitHubIssueResponseDTO createReport(ReportCreateDTO dto, List<MultipartFile> images) {
        logger.info("Creating report");
        return reportClientService.createReport(dto, images);
    }
}