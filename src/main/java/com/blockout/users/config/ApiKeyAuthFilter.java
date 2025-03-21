package com.blockout.users.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

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
            FilterChain filterChain) throws ServletException, IOException {

        // On ne vérifie l’API Key que pour la route POST /users
        // Vous pouvez affiner le check selon vos besoins.
        String path = request.getRequestURI();
        if ("POST".equalsIgnoreCase(request.getMethod()) && path.contains("/users/v1/users")) {
            String apiKey = request.getHeader(headerName);

            // Vérifie l'API Key
            if (apiKey == null || !apiKey.equals(expectedApiKey)) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid or missing API Key");
                return;
            }
        }

        // Si tout est OK, on continue la chaîne
        filterChain.doFilter(request, response);
    }
}