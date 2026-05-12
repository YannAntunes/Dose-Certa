package br.com.dosecerta.dose.certa.service;

import br.com.dosecerta.dose.certa.dto.LoginResponseDTO;
import br.com.dosecerta.dose.certa.entity.Usuario;
import br.com.dosecerta.dose.certa.repository.UsuarioRepository;
import br.com.dosecerta.dose.certa.security.JwtService;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UsuarioRepository repository;
    private final JwtService jwtService;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public AuthService(UsuarioRepository repository, JwtService jwtService, org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
    }

    public LoginResponseDTO autenticar(String login, String senha) {

        Usuario usuario = repository.findByLogin(login)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));

        if (!passwordEncoder.matches(senha, usuario.getSenha()))
            throw new IllegalArgumentException("Senha inválida");

        String token = jwtService.gerarToken(
                usuario.getLogin(),
                usuario.getPerfil().name()
        );

        return new LoginResponseDTO(usuario, token);
    }
}


