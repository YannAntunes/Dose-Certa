package br.com.dosecerta.dose.certa.controller;

import br.com.dosecerta.dose.certa.entity.Enfermeiro;
import br.com.dosecerta.dose.certa.service.EnfermeiroService;
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
    public List<Enfermeiro> listar() {
        return service.listarTodos();
    }

    @PostMapping
    public Enfermeiro criar(@RequestBody Enfermeiro enfermeiro) {
        return service.salvar(enfermeiro);
    }

    @PutMapping("/{id}")
    public Enfermeiro atualizar(@PathVariable Long id, @RequestBody Enfermeiro enfermeiro) {
        return service.atualizar(id, enfermeiro);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
