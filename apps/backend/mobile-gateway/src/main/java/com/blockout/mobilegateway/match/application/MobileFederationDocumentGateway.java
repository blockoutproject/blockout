package com.blockout.mobilegateway.match.application;

/** Signs and resolves short-lived federation-document continuations. */
public interface MobileFederationDocumentGateway {

    /** Creates the two signed document URLs for one match. */
    SignedDocuments sign(String season, String leagueCode, String matchCode);

    /** Resolves one signed continuation to PDF bytes. */
    Document fetch(String token);

    /** Signed match-document URLs. */
    record SignedDocuments(String addressPdfUrl, String sheetPdfUrl) {
    }

    /** Proxied PDF payload. */
    record Document(byte[] content) {

        /** Defensively copies the provider payload. */
        public Document {
            content = content == null ? new byte[0] : content.clone();
        }

        /** Returns a defensive copy for the API adapter. */
        @Override
        public byte[] content() {
            return content.clone();
        }
    }
}
