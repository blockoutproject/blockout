package com.blockout.mobilegateway.report.application;

import com.blockout.mobilegateway.shared.application.BinaryPart;
import java.util.List;

public interface MobileReportGateway {

    MobileReportWorkflow.Result create(MobileReportWorkflow.Command command, List<BinaryPart> images);
}
