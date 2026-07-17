package com.blockout.mobilegateway.report.api;

import com.blockout.mobilegateway.generated.api.MobileReportsApi;
import com.blockout.mobilegateway.generated.model.CreateMobileReportRequest;
import com.blockout.mobilegateway.generated.model.MobileReportCreated;
import com.blockout.mobilegateway.report.application.MobileReportWorkflow;
import com.blockout.mobilegateway.shared.api.BinaryParts;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
public class MobileReportV2Controller implements MobileReportsApi {

    private final MobileReportWorkflow workflow;

    @Override
    public ResponseEntity<MobileReportCreated> createMobileReport(
            CreateMobileReportRequest data, List<MultipartFile> images) {
        var command = new MobileReportWorkflow.Command(
                data.getType(), data.getTitle(), data.getDescription(), data.getAppVersion(), data.getUserId(),
                data.getUserName(), data.getScreen(), data.getDeviceModel(), data.getOs());
        var result = workflow.create(command, BinaryParts.from(images));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new MobileReportCreated(result.number(), result.htmlUrl(), result.title()));
    }
}
