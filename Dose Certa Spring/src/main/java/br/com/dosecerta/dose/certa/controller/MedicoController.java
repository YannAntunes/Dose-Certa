package br.com.dosecerta.dose.certa.controller;

import br.com.dosecerta.dose.certa.dto.MedicoRequestDTO;
import br.com.dosecerta.dose.certa.dto.MedicoResponseDTO;
import br.com.dosecerta.dose.certa.service.MedicoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * FIX C-06: Controller agora usa MedicoRequestDTO/MedicoResponseDTO.
 * FIX B-05: POST retorna 201 Created.
 */
@Tag(name = "Médicos", description = "Gerenciamento de médicos")
@RestController
@RequestMapping("/medicos")
public class MedicoController {

    private final MedicoService service;

    public MedicoController(MedicoService service) {
        this.service = service;
    }

    @Operation(summary = "Listar todos os médicos")
    @GetMapping
    public List<MedicoResponseDTO> listar() {
        return service.listarTodos()
                .stream()
                .map(MedicoResponseDTO::new)
                .toList();
    }

    @Operation(summary = "Cadastrar novo médico")
    @PostMapping
    public ResponseEntity<MedicoResponseDTO> criar(@RequestBody MedicoRequestDTO request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(new MedicoResponseDTO(service.salvar(request.toEntity())));
    }

    @Operation(summary = "Atualizar médico existente")
    @PutMapping("/{id}")
    public MedicoResponseDTO atualizar(
            @PathVariable Long id,
            @RequestBody MedicoRequestDTO request) {
        return new MedicoResponseDTO(service.atualizar(id, request.toEntity()));
    }

    @Operation(summary = "Excluir médico")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
