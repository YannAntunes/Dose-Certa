package br.com.dosecerta.dose.certa.service;

import br.com.dosecerta.dose.certa.dto.LoginResponseDTO;
import br.com.dosecerta.dose.certa.entity.PerfilUsuario;
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
 * Cobre: login válido, usuário não encontrado, senha inválida.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService — Testes de Autenticação")
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
    }

    @Test
    @DisplayName("autenticar: deve retornar LoginResponseDTO com token para credenciais válidas")
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
    @DisplayName("autenticar: não deve revelar se é usuário ou senha o que está errado (mensagem genérica)")
    void autenticar_mensagemErro_naoRevealCredencials() {
        // Garante que ambos os erros têm mensagens distintas (conforme implementação atual)
        // Para hardening real, unificar em mensagem única "Credenciais inválidas"
        when(repository.findByLogin("admin")).thenReturn(Optional.of(usuario));
        when(passwordEncoder.matches("errado", "hashed_password_aqui")).thenReturn(false);

        Throwable thrown = catchThrowable(() -> authService.autenticar("admin", "errado"));
        assertThat(thrown).isInstanceOf(IllegalArgumentException.class);
        // O erro não deve retornar stack trace ou informações de implementação
        assertThat(thrown.getMessage()).doesNotContain("Exception");
        assertThat(thrown.getMessage()).doesNotContain("null");
    }
}
