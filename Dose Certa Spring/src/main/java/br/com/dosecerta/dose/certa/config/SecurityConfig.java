package br.com.dosecerta.dose.certa.config;

import br.com.dosecerta.dose.certa.security.IdempotencyFilter;
import br.com.dosecerta.dose.certa.security.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final IdempotencyFilter idempotencyFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, IdempotencyFilter idempotencyFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.idempotencyFilter = idempotencyFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Desativa CSRF (API stateless com JWT)
                .csrf(csrf -> csrf.disable())

                // CORS (usa o bean CorsConfig)
                .cors(Customizer.withDefaults())

                // ══════════════════════════════════════════════════════
                // Regras de acesso por perfil (FIX C-03 + Cadastro Público Seguro)
                // ══════════════════════════════════════════════════════
                .authorizeHttpRequests(auth -> auth
                        // Libera preflight OPTIONS
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Login e healthchecks públicos
                        .requestMatchers(HttpMethod.POST, "/login").permitAll()
                        .requestMatchers(HttpMethod.GET, "/login").permitAll()
                        .requestMatchers("/", "/health/ready", "/health/live").permitAll()
                        // Swagger / OpenAPI documenta��o p�blica
                        .requestMatchers("/swagger/**", "/swagger-ui/**", "/swagger-ui.html", "/api-docs/**", "/v3/api-docs/**").permitAll()

                        // ── CADASTRO PÚBLICO (sempre cria com status PENDENTE, sem autoatribuição de ADMIN) ──
                        .requestMatchers(HttpMethod.POST, "/usuarios/cadastro-publico").permitAll()

                        // ── USUÁRIOS: administração somente ADMIN ──
                        .requestMatchers("/usuarios/**").hasAuthority("ADMIN")

                        // ── MEDICAMENTOS: leitura p/ todos, escrita p/ ADMIN e MEDICO ──
                        .requestMatchers(HttpMethod.GET, "/medicamentos/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/medicamentos/**").hasAnyAuthority("ADMIN", "MEDICO")
                        .requestMatchers(HttpMethod.PUT, "/medicamentos/**").hasAnyAuthority("ADMIN", "MEDICO")
                        .requestMatchers(HttpMethod.DELETE, "/medicamentos/**").hasAuthority("ADMIN")

                        // ── PACIENTES: leitura p/ todos; criação/edição p/ ADMIN, MEDICO e RECEPCAO ──
                        .requestMatchers(HttpMethod.GET, "/pacientes/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/pacientes/**").hasAnyAuthority("ADMIN", "MEDICO", "RECEPCAO")
                        .requestMatchers(HttpMethod.PUT, "/pacientes/**").hasAnyAuthority("ADMIN", "MEDICO", "RECEPCAO")
                        .requestMatchers(HttpMethod.DELETE, "/pacientes/**").hasAnyAuthority("ADMIN", "MEDICO")

                        // ── MÉDICOS: leitura p/ todos; escrita somente ADMIN ──
                        .requestMatchers(HttpMethod.GET, "/medicos/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/medicos/**").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/medicos/**").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/medicos/**").hasAuthority("ADMIN")

                        // ── ENFERMEIROS: leitura p/ todos; escrita somente ADMIN ──
                        .requestMatchers(HttpMethod.GET, "/enfermeiros/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/enfermeiros/**").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/enfermeiros/**").hasAuthority("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/enfermeiros/**").hasAuthority("ADMIN")

                        // ── CONSULTAS: criação p/ MEDICO, ENFERMEIRO e ADMIN ──
                        .requestMatchers(HttpMethod.GET, "/consultas/**").authenticated()
                        .requestMatchers(HttpMethod.POST, "/consultas/**").hasAnyAuthority("ADMIN", "MEDICO", "ENFERMEIRO")

                        // ── HISTÓRICO: leitura p/ todos autenticados ──
                        .requestMatchers(HttpMethod.GET, "/historico/**").authenticated()
                        // ── EXAMES (/api/v1): dados clinicos; RECEPCAO sem acesso ──
                        .requestMatchers(HttpMethod.POST, "/api/v1/exams/*/analyze").hasAnyAuthority("ADMIN", "MEDICO")
                        .requestMatchers(HttpMethod.POST, "/api/v1/exams").hasAnyAuthority("ADMIN", "MEDICO", "ENFERMEIRO")
                        .requestMatchers(HttpMethod.GET, "/api/v1/**").hasAnyAuthority("ADMIN", "MEDICO", "ENFERMEIRO")
                        .requestMatchers("/api/v1/**").denyAll()

                        // Qualquer outra rota exige autenticação
                        .anyRequest().authenticated()
                )

                // Sem sessão HTTP (stateless)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // Filtra JWT antes do filtro padrão do Spring e aplica idempotência após autenticação
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterAfter(idempotencyFilter, JwtAuthFilter.class);

        return http.build();
    }

    @Bean
    public org.springframework.security.crypto.password.PasswordEncoder passwordEncoder() {
        return new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
    }
}
