package com.blockout.mobilegateway.match.api;

import com.blockout.mobilegateway.generated.api.MobileFederationDocumentsApi;
import com.blockout.mobilegateway.match.application.MobileFederationDocumentGateway;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

/** Implements the generated signed federation-document continuation. */
@RestController
@RequiredArgsConstructor
public class MobileFederationDocumentsV2Controller implements MobileFederationDocumentsApi {

    private final MobileFederationDocumentGateway documents;

    /** Returns one validated and proxied federation PDF. */
    @Override
    public ResponseEntity<Resource> getMobileFederationPdf(String token) {
        MobileFederationDocumentGateway.Document document = documents.fetch(token);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .cacheControl(CacheControl.noStore().cachePrivate())
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename("document.pdf").build().toString())
                .body(new ByteArrayResource(document.content()));
    }
}
