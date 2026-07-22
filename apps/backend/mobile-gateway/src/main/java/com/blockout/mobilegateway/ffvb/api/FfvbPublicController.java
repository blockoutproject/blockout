package com.blockout.mobilegateway.ffvb.api;

import static net.logstash.logback.argument.StructuredArguments.keyValue;

import com.blockout.mobilegateway.api.FfvbPublicApi;
import com.blockout.mobilegateway.ffvb.application.FfvbPdfApplicationService;
import com.blockout.mobilegateway.ffvb.application.FfvbPdfDownload;
import io.jsonwebtoken.JwtException;
import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class FfvbPublicController implements FfvbPublicApi {

    private static final Logger logger = LoggerFactory.getLogger(FfvbPublicController.class);

    private final FfvbPdfApplicationService pdfService;

    public FfvbPublicController(FfvbPdfApplicationService pdfService) {
        this.pdfService = pdfService;
    }

    @Override
    public ResponseEntity<Resource> proxySignedFfvbPdf(String token) {
        Instant start = Instant.now();
        try {
            FfvbPdfDownload download = pdfService.download(token);
            if (download.transportError()) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
            }
            if (!HttpStatus.valueOf(download.statusCode()).is2xxSuccessful() || download.content() == null) {
                logger.error("Upstream non-success response", keyValue("status", download.statusCode()));
                return ResponseEntity.status(download.statusCode()).build();
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDisposition(ContentDisposition.inline().filename("document.pdf").build());
            headers.setCacheControl("private, no-store");
            logger.info("FFVB PDF success",
                keyValue("size", download.content().length),
                keyValue("ms", Duration.between(start, Instant.now()).toMillis()));
            return new ResponseEntity<>(new ByteArrayResource(download.content()), headers, HttpStatus.OK);
        } catch (JwtException error) {
            logger.warn("Invalid or expired FFVB PDF link");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (IllegalArgumentException error) {
            logger.warn("Invalid PDF kind", error);
            return ResponseEntity.badRequest().build();
        } catch (Exception error) {
            logger.error("Unhandled exception in FFVB PDF proxy", error,
                keyValue("ms", Duration.between(start, Instant.now()).toMillis()));
            return ResponseEntity.internalServerError().build();
        }
    }
}
