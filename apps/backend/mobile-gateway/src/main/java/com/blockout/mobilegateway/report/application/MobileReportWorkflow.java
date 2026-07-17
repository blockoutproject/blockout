package com.blockout.mobilegateway.report.application;

import com.blockout.mobilegateway.shared.application.BinaryPart;
import com.blockout.shared.model.ReportTypeEnum;
import java.net.URI;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MobileReportWorkflow {

    private final MobileReportGateway gateway;

    public Result create(Command command, List<BinaryPart> images) {
        return gateway.create(command, List.copyOf(images));
    }

    public record Command(
            ReportTypeEnum type,
            String title,
            String description,
            String appVersion,
            Long userId,
            String userName,
            String screen,
            String deviceModel,
            String os) {
    }

    public record Result(Integer number, URI htmlUrl, String title) {
    }
}
