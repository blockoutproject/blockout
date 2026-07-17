package com.blockout.users.shared.security;

import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

/** Resolves the authenticated Auth0 subject without leaking Spring Security into application services. */
@Component
public class AuthenticatedUserSubject {

    /** Returns the current JWT subject or fails as an authentication error. */
    public String get() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Jwt jwt) {
            return jwt.getSubject();
        }
        throw new AuthenticationCredentialsNotFoundException("Authenticated JWT subject is required.");
    }
}
