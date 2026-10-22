package br.com.dosecerta.dose.certa.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Filtro de idempotência para operações POST/PUT sincronizadas da fila offline-first.
 * Evita duplicação de registros clínicos ou cadastrais em caso de retry por falha de rede/timeout.
 */
@Component
public class IdempotencyFilter extends OncePerRequestFilter {

    private static final String HEADER_NAME = "X-Idempotency-Key";
    private static final long TTL_MS = 15 * 60 * 1000L; // 15 minutos
    private static final int MAX_ENTRIES = 1000;

    private record CachedResponse(int status, String contentType, String body, long timestamp) {}

    private final Map<String, CachedResponse> cache = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String idempotencyKey = request.getHeader(HEADER_NAME);
        String method = request.getMethod();

        if (idempotencyKey == null || idempotencyKey.isBlank()
                || (!"POST".equalsIgnoreCase(method) && !"PUT".equalsIgnoreCase(method))) {
            filterChain.doFilter(request, response);
            return;
        }

        evictExpired();

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String principal = (auth != null && auth.getName() != null) ? auth.getName() : "anonymous";
        String compositeKey = principal + ":" + method.toUpperCase() + ":" + request.getRequestURI() + ":" + idempotencyKey.trim();

        CachedResponse existing = cache.get(compositeKey);
        if (existing != null && (System.currentTimeMillis() - existing.timestamp()) < TTL_MS) {
            response.setStatus(existing.status());
            response.setContentType(existing.contentType() != null ? existing.contentType() : "application/json;charset=UTF-8");
            response.setHeader("X-Idempotent-Replay", "true");
            response.getWriter().write(existing.body());
            return;
        }

        ContentCachingResponseWrapper wrapper = new ContentCachingResponseWrapper(response);
        filterChain.doFilter(request, wrapper);

        int status = wrapper.getStatus();
        if (status >= 200 && status < 300) {
            String body = new String(wrapper.getContentAsByteArray(), StandardCharsets.UTF_8);
            cache.put(compositeKey, new CachedResponse(
                    status,
                    wrapper.getContentType(),
                    body,
                    System.currentTimeMillis()
            ));
        }

        wrapper.copyBodyToResponse();
    }

    private void evictExpired() {
        if (cache.size() <= MAX_ENTRIES) {
            return;
        }
        long now = System.currentTimeMillis();
        cache.entrySet().removeIf(entry -> (now - entry.getValue().timestamp()) >= TTL_MS);
    }
}
