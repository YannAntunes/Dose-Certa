package br.com.dosecerta.dose.certa.controller;

import br.com.dosecerta.dose.certa.dto.AprovacaoUsuarioRequestDTO;
import br.com.dosecerta.dose.certa.dto.RegistroPublicoRequestDTO;
import br.com.dosecerta.dose.certa.dto.UsuarioRequestDTO;
import br.com.dosecerta.dose.certa.dto.UsuarioResponseDTO;
import br.com.dosecerta.dose.certa.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/usuarios")
public class UsuarioController {

    private final UsuarioService service;

    public UsuarioController(UsuarioService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<UsuarioResponseDTO>> listar() {
        return ResponseEntity.ok(service.listarTodos());
    }

    @PostMapping
    public ResponseEntity<UsuarioResponseDTO> criar(@RequestBody UsuarioRequestDTO dto) {
        UsuarioResponseDTO criado = service.criar(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(criado);
    }

    /**
     * Endpoint público para solicitação de cadastro de novos usuários.
     * Cria sempre com status PENDENTE e nunca permite autoatribuição de ADMIN.
     */
    @PostMapping("/cadastro-publico")
    public ResponseEntity<UsuarioResponseDTO> solicitarCadastroPublico(
            @RequestBody RegistroPublicoRequestDTO dto,
            HttpServletRequest request
    ) {
        String forwarded = request.getHeader("X-Forwarded-For");
        String clientIp = (forwarded != null && !forwarded.isBlank())
                ? forwarded.split(",")[0].trim()
                : request.getRemoteAddr();
        UsuarioResponseDTO criado = service.solicitarCadastroPublico(dto, clientIp);
        return ResponseEntity.status(HttpStatus.CREATED).body(criado);
    }

    @PutMapping("/{id}")
    public ResponseEntity<UsuarioResponseDTO> atualizar(
            @PathVariable Long id,
            @RequestBody UsuarioRequestDTO dto) {
        return ResponseEntity.ok(service.atualizar(id, dto));
    }

    @PutMapping("/{id}/aprovar")
    public ResponseEntity<UsuarioResponseDTO> aprovar(
            @PathVariable Long id,
            @RequestBody(required = false) AprovacaoUsuarioRequestDTO dto) {
        return ResponseEntity.ok(service.aprovar(id, dto));
    }

    @PutMapping("/{id}/rejeitar")
    public ResponseEntity<UsuarioResponseDTO> rejeitar(
            @PathVariable Long id,
            Authentication authentication) {
        String adminLogado = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(service.rejeitar(id, adminLogado));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<UsuarioResponseDTO> alterarStatus(
            @PathVariable Long id,
            @RequestBody AprovacaoUsuarioRequestDTO dto,
            Authentication authentication) {
        String adminLogado = authentication != null ? authentication.getName() : null;
        return ResponseEntity.ok(service.alterarStatus(id, dto != null ? dto.getStatus() : null, adminLogado));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
