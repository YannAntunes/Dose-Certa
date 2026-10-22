package br.com.dosecerta.dose.certa.security;

import br.com.dosecerta.dose.certa.entity.StatusUsuario;
import br.com.dosecerta.dose.certa.entity.Usuario;
import br.com.dosecerta.dose.certa.repository.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UsuarioRepository usuarioRepository;

    public JwtAuthFilter(JwtService jwtService, UsuarioRepository usuarioRepository) {
        this.jwtService = jwtService;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                String login = jwtService.getLogin(token);
                String perfilToken = jwtService.getPerfil(token);

                Optional<Usuario> usuarioOpt = usuarioRepository.findByLogin(login)
                        .or(() -> usuarioRepository.findByLoginIgnoreCase(login));

                if (usuarioOpt.isEmpty() || usuarioOpt.get().getStatus() != StatusUsuario.ATIVO) {
                    SecurityContextHolder.clearContext();
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write(
                            "{\"status\":401,\"error\":\"CONTA_INATIVA\",\"message\":\"Sessão inválida ou usuário inativo/pendente.\"}"
                    );
                    return;
                }

                Usuario usuarioAtivo = usuarioOpt.get();
                String perfilEfetivo = usuarioAtivo.getPerfil() != null
                        ? usuarioAtivo.getPerfil().name()
                        : (perfilToken != null ? perfilToken : "");

                List<SimpleGrantedAuthority> authorities = List.of(
                        new SimpleGrantedAuthority(perfilEfetivo)
                );

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(usuarioAtivo.getLogin(), null, authorities);

                authentication.setDetails(
                        new WebAuthenticationDetailsSource().buildDetails(request)
                );

                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (Exception e) {
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }
}
