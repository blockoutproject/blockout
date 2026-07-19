package com.blockout.mobilegateway.ffvb.api;

import com.blockout.mobilegateway.ffvb.application.FfvbPdfApplicationService;
import com.blockout.mobilegateway.ffvb.application.FfvbPdfDownload;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

@RestController
@RequestMapping("/api/v1/mobile/public/ffvb")
public class FfvbPublicController {

    private static final Logger logger = LoggerFactory.getLogger(FfvbPublicController.class);

    private final FfvbPdfApplicationService pdfService;

    public FfvbPublicController(FfvbPdfApplicationService pdfService) {
        this.pdfService = pdfService;
    }

    @GetMapping("/pdf/{token}")
    public void proxySigned(@PathVariable String token, HttpServletResponse resp) throws Exception {
        Instant start = Instant.now();

        logger.info("FFVB PDF request received");

        try {
            FfvbPdfDownload download;

            try {
                download = pdfService.download(token);
            } catch (JwtException e) {
                logger.warn("Invalid or expired FFVB PDF link");
                resp.sendError(401, "Invalid or expired link");
                return;
            } catch (IllegalArgumentException e) {
                logger.warn("Invalid PDF kind", e);
                resp.sendError(400, "Invalid kind");
                return;
            }

            if (download.transportError()) {
                resp.sendError(502, "Upstream error");
                return;
            }

            if (!HttpStatus.valueOf(download.statusCode()).is2xxSuccessful() || download.content() == null) {
                logger.error("Upstream non-success response",
                        keyValue("status", download.statusCode()));

                resp.setStatus(download.statusCode());
                resp.setContentType("text/plain; charset=utf-8");
                resp.getOutputStream()
                        .write(("Upstream error: " + download.statusCode())
                                .getBytes(StandardCharsets.UTF_8));
                return;
            }

            resp.setStatus(200);
            resp.setHeader("Content-Type", "application/pdf");
            resp.setHeader("Content-Disposition", "inline; filename=\"document.pdf\"");
            resp.setHeader("Cache-Control", "private, no-store");
            resp.getOutputStream().write(download.content());

            logger.info("FFVB PDF success",
                    keyValue("size", download.content().length),
                    keyValue("ms", Duration.between(start, Instant.now()).toMillis()));

        } catch (Exception e) {
            logger.error("Unhandled exception in proxySigned", e);

            if (!resp.isCommitted()) {
                resp.sendError(500, "Internal error");
            }

            logger.error("Request failed",
                    keyValue("ms", Duration.between(start, Instant.now()).toMillis()));
        }
    }
}
