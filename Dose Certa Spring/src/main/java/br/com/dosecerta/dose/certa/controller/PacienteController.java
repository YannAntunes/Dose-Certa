package br.com.dosecerta.dose.certa.controller;

import br.com.dosecerta.dose.certa.dto.PacienteDTO;
import br.com.dosecerta.dose.certa.dto.PacienteRequestDTO;
import br.com.dosecerta.dose.certa.entity.Paciente;
import br.com.dosecerta.dose.certa.service.PacienteService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/pacientes")
public class PacienteController {

    private final PacienteService service;

    public PacienteController(PacienteService service) {
        this.service = service;
    }

    @GetMapping
    public List<PacienteDTO> listar() {
        return service.listarTodos()
                .stream()
                .map(PacienteDTO::new)
                .toList();
    }

    @PostMapping
    public ResponseEntity<PacienteDTO> criar(@RequestBody PacienteRequestDTO request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(new PacienteDTO(service.salvar(request.toEntity())));
    }

    @PutMapping("/{id}")
    public PacienteDTO atualizar(@PathVariable Long id, @RequestBody PacienteRequestDTO request) {
        return new PacienteDTO(service.atualizar(id, request.toEntity()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
