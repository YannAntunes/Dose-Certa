package br.com.dosecerta.dose.certa.controller;

import br.com.dosecerta.dose.certa.dto.MedicamentoRequestDTO;
import br.com.dosecerta.dose.certa.dto.MedicamentoResponseDTO;
import br.com.dosecerta.dose.certa.service.MedicamentoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * FIX C-06: Controller agora usa MedicamentoRequestDTO e MedicamentoResponseDTO
 * em vez da entidade JPA diretamente, prevenindo Mass Assignment Attack.
 * FIX B-05: POST agora retorna 201 Created consistentemente.
 */
@Tag(name = "Medicamentos", description = "Gerenciamento de medicamentos")
@RestController
@RequestMapping("/medicamentos")
public class MedicamentoController {

    private final MedicamentoService service;

    public MedicamentoController(MedicamentoService service) {
        this.service = service;
    }

    @Operation(summary = "Listar todos os medicamentos")
    @GetMapping
    public List<MedicamentoResponseDTO> listar() {
        return service.listarTodos()
                .stream()
                .map(MedicamentoResponseDTO::new)
                .toList();
    }

    @Operation(summary = "Cadastrar novo medicamento")
    @PostMapping
    public ResponseEntity<MedicamentoResponseDTO> criar(@RequestBody MedicamentoRequestDTO request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(new MedicamentoResponseDTO(service.salvar(request.toEntity())));
    }

    @Operation(summary = "Atualizar medicamento existente")
    @PutMapping("/{id}")
    public MedicamentoResponseDTO atualizar(
            @PathVariable Long id,
            @RequestBody MedicamentoRequestDTO request) {
        return new MedicamentoResponseDTO(service.atualizar(id, request.toEntity()));
    }

    @Operation(summary = "Excluir medicamento")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
