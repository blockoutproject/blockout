package com.blockout.mobilegateway.services;

import com.blockout.mobilegateway.config.PdfLinkTokenProperties;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PdfLinkTokenService {

    private final PdfLinkTokenProperties props;

    private SecretKey key() {
        byte[] k;
        try { k = Decoders.BASE64.decode(props.getSecret()); }
        catch (Exception e) { k = props.getSecret().getBytes(); }
        return Keys.hmacShaKeyFor(k);
    }

    public String generate(String kind, String saison, String codent, String codmatch) {
        Instant now = Instant.now();
        Instant exp = now.plusSeconds(props.getTtlSeconds());
        return Jwts.builder()
                .header().add("kid", props.getKid()).and()
                .subject("ffvb-pdf")
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .claims(Map.of(
                        "kind", kind,
                        "saison", saison,
                        "codent", codent,
                        "codmatch", codmatch
                ))
                .signWith(key(), Jwts.SIG.HS256)
                .compact();
    }

    public Payload validate(String token) throws JwtException {
        Jws<Claims> jws = Jwts.parser().verifyWith(key()).build().parseSignedClaims(token);
        Claims c = jws.getPayload();
        return new Payload(
                c.get("kind", String.class),
                c.get("saison", String.class),
                c.get("codent", String.class),
                c.get("codmatch", String.class)
        );
    }

    public record Payload(String kind, String saison, String codent, String codmatch) {}
}