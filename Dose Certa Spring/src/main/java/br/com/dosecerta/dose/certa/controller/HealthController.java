package br.com.dosecerta.dose.certa.controller;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;
@RestController @RequestMapping("/health")
public class HealthController {
    private final JdbcTemplate jdbcTemplate;
    public HealthController(JdbcTemplate jdbcTemplate) { this.jdbcTemplate=jdbcTemplate; }
    @GetMapping("/ready")
    public ResponseEntity<Map<String,String>> ready() {
        try {
            Integer result=jdbcTemplate.queryForObject("SELECT 1",Integer.class);
            if (!Integer.valueOf(1).equals(result))
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("status","DOWN","database","DOWN"));
            return ResponseEntity.ok(Map.of("status","UP","database","UP"));
        } catch (DataAccessException ex) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("status","DOWN","database","DOWN"));
        }
    }
}
