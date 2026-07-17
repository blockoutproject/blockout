package com.blockout.mobilegateway.match.application;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/** Carries an explicit API outcome for federation-document continuation failures. */
@Getter
public class MobileFederationDocumentException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    /** Creates a typed federation-document failure. */
    public MobileFederationDocumentException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}
