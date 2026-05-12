package br.com.dosecerta.dose.certa.controller;

import br.com.dosecerta.dose.certa.dto.EnfermeiroDTO;
import br.com.dosecerta.dose.certa.dto.EnfermeiroRequestDTO;
import br.com.dosecerta.dose.certa.entity.Enfermeiro;
import br.com.dosecerta.dose.certa.service.EnfermeiroService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/enfermeiros")
public class EnfermeiroController {

    private final EnfermeiroService service;

    public EnfermeiroController(EnfermeiroService service) {
        this.service = service;
    }

    @GetMapping
    public List<EnfermeiroDTO> listar() {
        return service.listarTodos()
                .stream()
                .map(EnfermeiroDTO::new)
                .toList();
    }

    @PostMapping
    public ResponseEntity<EnfermeiroDTO> criar(@RequestBody EnfermeiroRequestDTO request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(new EnfermeiroDTO(service.salvar(request.toEntity())));
    }

    @PutMapping("/{id}")
    public EnfermeiroDTO atualizar(@PathVariable Long id, @RequestBody EnfermeiroRequestDTO request) {
        return new EnfermeiroDTO(service.atualizar(id, request.toEntity()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
