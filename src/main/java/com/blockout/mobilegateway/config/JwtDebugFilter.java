package com.blockout.mobilegateway.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtDebugFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(JwtDebugFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            //String token = authHeader.substring(7);
            logger.info("🧩 Received JWT token");
        } else {
            logger.warn("⚠️ No Authorization header found for request {}", request.getRequestURI());
        }

        filterChain.doFilter(request, response);
    }

    // private String truncateToken(String token) {
    //     if (token == null)
    //         return "<null>";

    //     int keep = 10;
    //     if (token.length() <= keep * 2) {
    //         return token;
    //     }
    //     return token.substring(0, keep) + "..." + token.substring(token.length() - keep);
    // }
}