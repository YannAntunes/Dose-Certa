package br.com.dosecerta.dose.certa.service;

import br.com.dosecerta.dose.certa.controller.ContaInativaException;
import br.com.dosecerta.dose.certa.dto.LoginResponseDTO;
import br.com.dosecerta.dose.certa.entity.PerfilUsuario;
import br.com.dosecerta.dose.certa.entity.StatusUsuario;
import br.com.dosecerta.dose.certa.entity.Usuario;
import br.com.dosecerta.dose.certa.repository.UsuarioRepository;
import br.com.dosecerta.dose.certa.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * Testes unitários do AuthService.
 * Cobre: login válido, usuário não encontrado, senha inválida, e bloqueio de contas PENDENTE, REJEITADO e INATIVO.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService — Testes de Autenticação e Status de Conta")
class AuthServiceTest {

    @Mock
    private UsuarioRepository repository;

    @Mock
    private JwtService jwtService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    private Usuario usuario;

    @BeforeEach
    void setUp() {
        usuario = new Usuario();
        usuario.setLogin("admin");
        usuario.setSenha("hashed_password_aqui");
        usuario.setPerfil(PerfilUsuario.ADMIN);
        usuario.setStatus(StatusUsuario.ATIVO);
    }

    @Test
    @DisplayName("autenticar: deve retornar LoginResponseDTO com token para credenciais válidas e conta ATIVA")
    void autenticar_credenciaisValidas_retornaToken() {
        when(repository.findByLogin("admin")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("senha123", "hashed_password_aqui")).thenReturn(true);
        when(jwtService.gerarToken("admin", "ADMIN")).thenReturn("jwt_token_gerado");

        LoginResponseDTO resultado = authService.autenticar("admin", "senha123");

        assertThat(resultado.getLogin()).isEqualTo("admin");
        assertThat(resultado.getToken()).isEqualTo("jwt_token_gerado");
        assertThat(resultado.getPerfil().name()).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("autenticar: deve lançar exceção para usuário inexistente")
    void autenticar_usuarioInexistente_lancaExcecao() {
        when(repository.findByLogin("inexistente")).thenReturn(Optional.empty());
        when(repository.findByLoginIgnoreCase("inexistente")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.autenticar("inexistente", "qualquer"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Usuário não encontrado");
    }

    @Test
    @DisplayName("autenticar: deve lançar exceção para senha inválida")
    void autenticar_senhaInvalida_lancaExcecao() {
        when(repository.findByLogin("admin")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("senhaErrada", "hashed_password_aqui")).thenReturn(false);

        assertThatThrownBy(() -> authService.autenticar("admin", "senhaErrada"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Senha inválida");
    }

    @Test
    @DisplayName("autenticar: deve bloquear login de usuário com status PENDENTE")
    void autenticar_usuarioPendente_bloqueiaLogin() {
        usuario.setStatus(StatusUsuario.PENDENTE);
        when(repository.findByLogin("admin")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("senha123", "hashed_password_aqui")).thenReturn(true);

        assertThatThrownBy(() -> authService.autenticar("admin", "senha123"))
                .isInstanceOf(ContaInativaException.class)
                .hasMessageContaining("pendente de aprovação");
    }

    @Test
    @DisplayName("autenticar: deve bloquear login de usuário com status REJEITADO")
    void autenticar_usuarioRejeitado_bloqueiaLogin() {
        usuario.setStatus(StatusUsuario.REJEITADO);
        when(repository.findByLogin("admin")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("senha123", "hashed_password_aqui")).thenReturn(true);

        assertThatThrownBy(() -> authService.autenticar("admin", "senha123"))
                .isInstanceOf(ContaInativaException.class)
                .hasMessageContaining("rejeitada");
    }

    @Test
    @DisplayName("autenticar: deve bloquear login de usuário com status INATIVO")
    void autenticar_usuarioInativo_bloqueiaLogin() {
        usuario.setStatus(StatusUsuario.INATIVO);
        when(repository.findByLogin("admin")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("senha123", "hashed_password_aqui")).thenReturn(true);

        assertThatThrownBy(() -> authService.autenticar("admin", "senha123"))
                .isInstanceOf(ContaInativaException.class)
                .hasMessageContaining("inativo");
    }

    @Test
    @DisplayName("autenticar: não deve revelar detalhes internos na mensagem de erro")
    void autenticar_mensagemErro_naoRevealCredencials() {
        when(repository.findByLogin("admin")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("errado", "hashed_password_aqui")).thenReturn(false);

        Throwable thrown = catchThrowable(() -> authService.autenticar("admin", "errado"));
        assertThat(thrown).isInstanceOf(IllegalArgumentException.class);
        assertThat(thrown.getMessage()).doesNotContain("Exception");
        assertThat(thrown.getMessage()).doesNotContain("null");
    }
}
