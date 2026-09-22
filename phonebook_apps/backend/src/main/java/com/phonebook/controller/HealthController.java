package com.phonebook.controller;

import com.phonebook.dto.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Public, unauthenticated liveness/readiness endpoint.
 *
 * <p>Used by the hosting platform's health check (Render:
 * {@code healthCheckPath: /api/health}) and for manual smoke tests right after a
 * deploy. It verifies that the process is up <em>and</em> that the Aiven for
 * MySQL connection works, but it never exposes configuration or credential
 * details.</p>
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    private static final Logger log = LoggerFactory.getLogger(HealthController.class);

    private final JdbcTemplate jdbcTemplate;

    public HealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, Object>>> health() {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("service", "phonebook-backend");
        details.put("timestamp", Instant.now().toString());

        try {
            Integer probe = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            if (probe == null || probe != 1) {
                throw new IllegalStateException("Unexpected database probe result: " + probe);
            }
            details.put("status", "UP");
            details.put("database", "UP");
            return ResponseEntity.ok(ApiResponse.ok("Phonebook API is healthy", details));
        } catch (Exception ex) {
            // Log the cause for operators, return a generic message to callers.
            log.error("Health check failed: database probe unsuccessful", ex);
            details.put("status", "DOWN");
            details.put("database", "DOWN");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(new ApiResponse<>(false, "Database connection unavailable", details));
        }
    }
}
