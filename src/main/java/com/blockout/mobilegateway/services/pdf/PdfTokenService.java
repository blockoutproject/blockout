package com.blockout.mobilegateway.services.pdf;

import com.blockout.mobilegateway.config.PdfProperties;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class PdfTokenService {

    private final SecretKey key;

    public PdfTokenService(PdfProperties pdfProperties) {
        String base64Secret = pdfProperties.getJwt().getSecret();

        // 🔒 Validation de la clé
        if (base64Secret == null || base64Secret.isBlank()) {
            throw new IllegalStateException("""
                    Missing property: pdf.jwt.secret
                    Generate one with:
                        openssl rand -base64 32
                    """);
        }

        byte[] secretBytes = Decoders.BASE64.decode(base64Secret);
        if (secretBytes.length < 32) {
            throw new IllegalStateException("""
                    Invalid pdf.jwt.secret: must be ≥ 32 bytes AFTER Base64 decoding.
                    Generate one with:
                        openssl rand -base64 32
                    """);
        }

        this.key = Keys.hmacShaKeyFor(secretBytes);
        log.info("PdfTokenService initialized with key length: {} bytes", secretBytes.length);
    }

    public String mint(String kind, String saison, String codent, String codmatch, long ttlSeconds) {
        Instant now = Instant.now();

        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .issuer("mobile-gateway")
                .audience().add("pdf-fetch").and()
                .subject("pdf")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(ttlSeconds)))
                .claims(Map.of(
                        "kind", kind,
                        "saison", saison,
                        "codent", codent,
                        "codmatch", codmatch))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public Map<String, Object> verify(String token) {
        return Jwts.parser()
                .requireIssuer("mobile-gateway")
                .requireAudience("pdf-fetch")
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}