package com.blockout.mobilegateway.services.pdf;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

import javax.crypto.SecretKey;

@Service
public class PdfTokenService {

    private final SecretKey key;

    public PdfTokenService(@Value("${pdf.jwt.secret}") String base64Secret) {
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(base64Secret));
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
                "saison", saison,
                "codent", codent,
                "codmatch", codmatch
            ))
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
