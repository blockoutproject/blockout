package com.blockout.mobilegateway.report.outbound;

import com.blockout.mobilegateway.report.application.MobileReportGateway;
import com.blockout.mobilegateway.report.application.MobileReportWorkflow;
import com.blockout.mobilegateway.reportsclient.api.ReportsClient;
import com.blockout.mobilegateway.reportsclient.model.CreateReportInternalRequest;
import com.blockout.mobilegateway.shared.application.BinaryPart;
import com.blockout.mobilegateway.shared.outbound.DownstreamClientSupport;
import com.blockout.mobilegateway.shared.outbound.TemporaryFilePart;
import java.io.File;
import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

@Component
public class GeneratedMobileReportGateway implements MobileReportGateway {

    private final ReportsClient userClient;
    private final ReportsClient m2mClient;

    public GeneratedMobileReportGateway(
            @Qualifier("reportsUserClient") ReportsClient userClient,
            @Qualifier("reportsM2mClient") ReportsClient m2mClient) {
        this.userClient = userClient;
        this.m2mClient = m2mClient;
    }

    @Override
    public MobileReportWorkflow.Result create(MobileReportWorkflow.Command command, List<BinaryPart> images) {
        var request = new CreateReportInternalRequest()
                .type(command.type())
                .title(command.title())
                .description(command.description())
                .userName(command.userName())
                .screen(command.screen())
                .os(command.os())
                .appVersion(command.appVersion())
                .userId(command.userId())
                .deviceModel(command.deviceModel());
        List<TemporaryFilePart> temporaryParts = new ArrayList<>();
        try {
            for (BinaryPart image : images) {
                temporaryParts.add(TemporaryFilePart.create(image));
            }
            List<File> files = temporaryParts.stream().map(TemporaryFilePart::file).toList();
            var response = client().createReport(request, files.isEmpty() ? null : files);
            return new MobileReportWorkflow.Result(response.getNumber(), response.getHtmlUrl(), response.getTitle());
        } finally {
            temporaryParts.forEach(TemporaryFilePart::close);
        }
    }

    private ReportsClient client() {
        return DownstreamClientSupport.hasUserJwt() ? userClient : m2mClient;
    }
}
