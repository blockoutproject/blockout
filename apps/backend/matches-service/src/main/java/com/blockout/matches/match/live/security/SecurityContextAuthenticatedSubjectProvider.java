package com.blockout.matches.match.live.security;

import com.blockout.matches.match.live.application.AuthenticatedSubjectProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class SecurityContextAuthenticatedSubjectProvider implements AuthenticatedSubjectProvider {

    @Override
    public String getSubject() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw new IllegalStateException("Authenticated JWT subject is unavailable.");
        }
        return jwt.getSubject();
    }
}
