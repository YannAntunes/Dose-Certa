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

    public AuthService(UsuarioRepository repository, JwtService jwtService) {
        this.repository = repository;
        this.jwtService = jwtService;
    }

    public LoginResponseDTO autenticar(String login, String senha) {

        Usuario usuario = repository.findByLogin(login)
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));

        if (!usuario.getSenha().equals(senha))
            throw new IllegalArgumentException("Senha inválida");

        String token = jwtService.gerarToken(
                usuario.getLogin(),
                usuario.getPerfil().name()
        );

        return new LoginResponseDTO(usuario, token);
    }
}


