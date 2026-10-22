package br.com.dosecerta.dose.certa.controller;

import br.com.dosecerta.dose.certa.entity.PerfilUsuario;
import br.com.dosecerta.dose.certa.entity.StatusUsuario;
import br.com.dosecerta.dose.certa.entity.Usuario;
import br.com.dosecerta.dose.certa.repository.PacienteRepository;
import br.com.dosecerta.dose.certa.repository.UsuarioRepository;
import br.com.dosecerta.dose.certa.security.JwtService;
import br.com.dosecerta.dose.certa.service.UsuarioService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Cadastro Público, Aprovação Admin, Revogação de Sessão e Idempotência")
class UsuarioCadastroAprovacaoIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PacienteRepository pacienteRepository;

    @Autowired
    private UsuarioService usuarioService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private ObjectMapper objectMapper;

    private String adminToken;

    @BeforeEach
    void setUp() {
        usuarioService.limparRateLimit();
        usuarioRepository.deleteAll();

        Usuario admin = new Usuario();
        admin.setLogin("admin_master");
        admin.setSenha(passwordEncoder.encode("AdminPass2026"));
        admin.setPerfil(PerfilUsuario.ADMIN);
        admin.setStatus(StatusUsuario.ATIVO);
        usuarioRepository.save(admin);

        adminToken = jwtService.gerarToken("admin_master", "ADMIN");
    }

    @Test
    @DisplayName("Fluxo completo: Cadastro público cria PENDENTE -> bloqueia login -> ADMIN aprova com perfil -> login liberado")
    void fluxoCompletoCadastroPublicoEAprovacao() throws Exception {
        // 1. Solicitação pública de cadastro
        MvcResult regResult = mockMvc.perform(post("/usuarios/cadastro-publico")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\":\"dra.helena\",\"senha\":\"Helena2026\",\"perfilSolicitado\":\"MEDICO\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.login").value("dra.helena"))
                .andExpect(jsonPath("$.status").value("PENDENTE"))
                .andExpect(jsonPath("$.perfilSolicitado").value("MEDICO"))
                .andReturn();

        JsonNode createdNode = objectMapper.readTree(regResult.getResponse().getContentAsString());
        long userId = createdNode.get("id").asLong();

        // 2. Tentativa de login enquanto PENDENTE deve retornar 403 Forbidden
        mockMvc.perform(post("/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\":\"dra.helena\",\"senha\":\"Helena2026\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error").value("CONTA_INATIVA"))
                .andExpect(jsonPath("$.message").value("Cadastro pendente de aprovação pelo administrador."));

        // 3. Mesmo que um token fosse forjado/emitido para conta PENDENTE, o filtro bloqueia com 401
        String tokenPendente = jwtService.gerarToken("dra.helena", "MEDICO");
        mockMvc.perform(get("/medicamentos")
                        .header("Authorization", "Bearer " + tokenPendente))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("CONTA_INATIVA"));

        // 4. Administrador aprova o cadastro e define o perfil autorizado
        mockMvc.perform(put("/usuarios/" + userId + "/aprovar")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"perfil\":\"MEDICO\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ATIVO"))
                .andExpect(jsonPath("$.perfil").value("MEDICO"));

        // 5. Login agora funciona e emite token válido
        MvcResult loginResult = mockMvc.perform(post("/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\":\"dra.helena\",\"senha\":\"Helena2026\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.perfil").value("MEDICO"))
                .andReturn();

        String activeToken = objectMapper.readTree(loginResult.getResponse().getContentAsString())
                .get("token").asText();

        // 6. Acesso autorizado a endpoints permitidos para MEDICO e bloqueado para /usuarios (restrito a ADMIN)
        mockMvc.perform(get("/medicamentos")
                        .header("Authorization", "Bearer " + activeToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/usuarios")
                        .header("Authorization", "Bearer " + activeToken))
                .andExpect(status().isForbidden());

        // 7. Se o ADMIN desativar ou rejeitar o usuário, o token JÁ EMITIDO passa a ser bloqueado imediatamente!
        mockMvc.perform(put("/usuarios/" + userId + "/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INATIVO\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INATIVO"));

        mockMvc.perform(get("/medicamentos")
                        .header("Authorization", "Bearer " + activeToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("CONTA_INATIVA"));
    }

    @Test
    @DisplayName("Segurança: Nunca permite autoatribuição de ADMIN no cadastro público")
    void bloqueiaAutoatribuicaoDeAdminNoCadastroPublico() throws Exception {
        mockMvc.perform(post("/usuarios/cadastro-publico")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\":\"atacante.admin\",\"senha\":\"SenhaForte123\",\"perfilSolicitado\":\"ADMIN\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Não é permitido solicitar perfil de Administrador no cadastro público."));

        assertThat(usuarioRepository.findByLogin("atacante.admin")).isEmpty();
    }

    @Test
    @DisplayName("Proteção contra abuso: bloqueia duplicidades e excesso de tentativas (Rate Limit 429)")
    void previneDuplicidadeERateLimitNoCadastroPublico() throws Exception {
        mockMvc.perform(post("/usuarios/cadastro-publico")
                        .header("X-Forwarded-For", "203.0.113.50")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\":\"user.dup\",\"senha\":\"SenhaForte123\",\"perfilSolicitado\":\"ENFERMEIRO\"}"))
                .andExpect(status().isCreated());

        // Duplicidade bloqueada
        mockMvc.perform(post("/usuarios/cadastro-publico")
                        .header("X-Forwarded-For", "203.0.113.50")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\":\"user.dup\",\"senha\":\"SenhaForte123\",\"perfilSolicitado\":\"ENFERMEIRO\"}"))
                .andExpect(status().isBadRequest());

        // Mais 3 tentativas do mesmo IP completam a janela de 5 requisições
        for (int i = 1; i <= 3; i++) {
            mockMvc.perform(post("/usuarios/cadastro-publico")
                            .header("X-Forwarded-For", "203.0.113.50")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"login\":\"user.extra" + i + "\",\"senha\":\"SenhaForte123\",\"perfilSolicitado\":\"RECEPCAO\"}"))
                    .andExpect(status().isCreated());
        }

        // A 6ª tentativa na janela retorna 429 Too Many Requests
        mockMvc.perform(post("/usuarios/cadastro-publico")
                        .header("X-Forwarded-For", "203.0.113.50")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"login\":\"user.abuso\",\"senha\":\"SenhaForte123\",\"perfilSolicitado\":\"RECEPCAO\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error").value("LIMITE_EXCEDIDO"));
    }

    @Test
    @DisplayName("Idempotência: POST /pacientes com mesmo X-Idempotency-Key não duplica registro")
    void idempotencyKeyPrevineDuplicacaoNoRetryDeSincronizacao() throws Exception {
        long countBefore = pacienteRepository.count();
        String key = "sync-req-uuid-12345";
        String body = "{\"nome\":\"Maria Offline Sync\",\"cpf\":\"529.982.247-25\",\"idade\":40,\"peso\":65.5,\"tipoDocumento\":\"CPF\",\"paisOrigem\":\"Brasil\"}";

        MvcResult first = mockMvc.perform(post("/pacientes")
                        .header("Authorization", "Bearer " + adminToken)
                        .header("X-Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();

        MvcResult second = mockMvc.perform(post("/pacientes")
                        .header("Authorization", "Bearer " + adminToken)
                        .header("X-Idempotency-Key", key)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(header().string("X-Idempotent-Replay", "true"))
                .andReturn();

        assertThat(second.getResponse().getContentAsString())
                .isEqualTo(first.getResponse().getContentAsString());
        assertThat(pacienteRepository.count()).isEqualTo(countBefore + 1);
    }
}
