package br.com.dosecerta.dose.certa.controller;

import br.com.dosecerta.dose.certa.entity.PerfilUsuario;
import br.com.dosecerta.dose.certa.entity.Usuario;
import br.com.dosecerta.dose.certa.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("LoginController — Contrato HTTP e CORS")
class LoginControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final String TEST_LOGIN = "admin_integration_test";
    private static final String TEST_PASS = "TestIntegrationPass#2026!";

    @BeforeEach
    void setUp() {
        usuarioRepository.deleteAll();
        Usuario admin = new Usuario();
        admin.setLogin(TEST_LOGIN);
        admin.setSenha(passwordEncoder.encode(TEST_PASS));
        admin.setPerfil(PerfilUsuario.ADMIN);
        usuarioRepository.save(admin);
    }

    @Test
    @DisplayName("POST /login com credenciais válidas retorna 200 e token JWT")
    void loginComCredenciaisValidasRetorna200EToken() throws Exception {
        String payload = String.format("{\"login\":\"%s\",\"senha\":\"%s\"}", TEST_LOGIN, TEST_PASS);

        mockMvc.perform(post("/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.login").value(TEST_LOGIN))
                .andExpect(jsonPath("$.perfil").value("ADMIN"))
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    @DisplayName("POST /login com usuário inexistente retorna 400 com mensagem clara")
    void loginComUsuarioInexistenteRetorna400() throws Exception {
        mockMvc.perform(post("/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\":\"inexistente\",\"senha\":\"qualquer\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Usuário não encontrado"));
    }

    @Test
    @DisplayName("POST /login com senha incorreta retorna 400 com mensagem clara")
    void loginComSenhaIncorretaRetorna400() throws Exception {
        String payload = String.format("{\"login\":\"%s\",\"senha\":\"senha_errada\"}", TEST_LOGIN);

        mockMvc.perform(post("/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Senha inválida"));
    }

    @Test
    @DisplayName("OPTIONS /login permite CORS para a origem de produção no Vercel")
    void preflightCorsPermiteOrigemVercel() throws Exception {
        mockMvc.perform(options("/login")
                        .header("Origin", "https://dose-certa-bay.vercel.app")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "https://dose-certa-bay.vercel.app"));
    }
}
