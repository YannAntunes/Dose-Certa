package br.com.dosecerta.dose.certa.config;

import br.com.dosecerta.dose.certa.security.JwtAuthFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;


@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Desativa CSRF (API stateless)
                .csrf(csrf -> csrf.disable())

                // CORS (usa o bean CorsConfig)
                .cors(Customizer.withDefaults())

                // Regras de acesso
                .authorizeHttpRequests(auth -> auth
                        // Libera preflight OPTIONS para qualquer endpoint
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        // Libera o endpoint de login
                        .requestMatchers(HttpMethod.POST, "/login").permitAll()
                        .requestMatchers("/login").permitAll()
                        // Gerenciamento de usuarios: apenas ADMIN
                        .requestMatchers("/usuarios/**").hasAuthority("ADMIN")
                        .anyRequest().authenticated()
                )

                // Sem sessao
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // JWT antes do filtro padrao
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public org.springframework.security.crypto.password.PasswordEncoder passwordEncoder() {
        return new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
    }
}
