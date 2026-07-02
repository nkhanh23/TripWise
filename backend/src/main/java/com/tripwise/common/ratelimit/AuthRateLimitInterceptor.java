package com.tripwise.common.ratelimit;

import com.tripwise.common.exception.TooManyRequestsException;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class AuthRateLimitInterceptor implements HandlerInterceptor {

    private static final String LOGIN_PATH = "/api/v1/auth/login";
    private static final String REGISTER_PATH = "/api/v1/auth/register";
    private static final String TRIP_GENERATION_PATH = "/api/v1/trips/generate";

    private final RateLimitProperties properties;
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public AuthRateLimitInterceptor(RateLimitProperties properties) {
        this.properties = properties;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!properties.isEnabled()) {
            return true;
        }

        String path = request.getRequestURI();
        RateLimitProperties.Rule rule = resolveRule(path);
        if (rule == null) {
            return true;
        }

        String bucketKey = path + ":" + resolveRequesterKey(request);
        Bucket bucket = buckets.computeIfAbsent(bucketKey, ignored -> newBucket(rule));

        if (!bucket.tryConsume(1)) {
            throw new TooManyRequestsException("Too many requests. Please try again later.");
        }

        return true;
    }

    private RateLimitProperties.Rule resolveRule(String path) {
        if (LOGIN_PATH.equals(path)) {
            return properties.getLogin();
        }
        if (REGISTER_PATH.equals(path)) {
            return properties.getRegister();
        }
        if (TRIP_GENERATION_PATH.equals(path)) {
            return properties.getTripGeneration();
        }
        return null;
    }

    private Bucket newBucket(RateLimitProperties.Rule rule) {
        return Bucket.builder()
                .addLimit(Bandwidth.classic(rule.getCapacity(), Refill.intervally(rule.getCapacity(), rule.getWindow())))
                .build();
    }

    private String resolveRequesterKey(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)
                && authentication.getName() != null
                && !authentication.getName().isBlank()) {
            return "user:" + authentication.getName();
        }
        return "ip:" + resolveClientIp(request);
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
