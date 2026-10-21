package br.com.dosecerta.dose.certa.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

/** Minimal process liveness endpoint for Render's existing root-path health check. */
@RestController
public class RootHealthController {
    @GetMapping("/")
    public Map<String, String> live() {
        return Map.of("status", "UP");
    }
}
