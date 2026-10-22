package br.com.dosecerta.dose.certa.service;

import br.com.dosecerta.dose.certa.controller.ContaInativaException;
import br.com.dosecerta.dose.certa.dto.LoginResponseDTO;
import br.com.dosecerta.dose.certa.entity.StatusUsuario;
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
        String normalizedLogin = login != null ? login.trim() : "";

        Usuario usuario = repository.findByLogin(normalizedLogin)
                .or(() -> repository.findByLoginIgnoreCase(normalizedLogin))
                .orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado"));

        if (!passwordEncoder.matches(senha, usuario.getSenha())) {
            throw new IllegalArgumentException("Senha inválida");
        }

        StatusUsuario status = usuario.getStatus();
        if (status == StatusUsuario.PENDENTE) {
            throw new ContaInativaException("Cadastro pendente de aprovação pelo administrador.");
        }
        if (status == StatusUsuario.REJEITADO) {
            throw new ContaInativaException("Solicitação de cadastro foi rejeitada pelo administrador.");
        }
        if (status == StatusUsuario.INATIVO) {
            throw new ContaInativaException("Usuário inativo. Entre em contato com o administrador.");
        }

        String token = jwtService.gerarToken(
                usuario.getLogin(),
                usuario.getPerfil().name()
        );

        return new LoginResponseDTO(usuario, token);
    }
}
