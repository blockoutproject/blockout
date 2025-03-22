package com.blockout.users.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.util.List;

public class ApiKeyAuthFilter extends OncePerRequestFilter {

    private final String headerName;
    private final String expectedApiKey;

    public ApiKeyAuthFilter(String headerName, String expectedApiKey) {
        this.headerName = headerName;
        this.expectedApiKey = expectedApiKey;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        // Vérifie s'il y a déjà une authentification (par ex. via JWT)
        // Si oui, pas la peine de checker l’API Key
        if (SecurityContextHolder.getContext().getAuthentication() == null) {

            // Récupère l'API Key depuis l'en-tête
            String apiKeyValue = request.getHeader(headerName);

            if (apiKeyValue != null && apiKeyValue.equals(expectedApiKey)) {
                // On crée un "utilisateur technique" avec un rôle "ROLE_API"
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        "machineUser",
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_API")));

                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        // Passe la main aux filtres suivants
        filterChain.doFilter(request, response);
    }
}