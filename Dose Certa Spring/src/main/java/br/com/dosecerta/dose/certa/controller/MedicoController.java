package br.com.dosecerta.dose.certa.controller;

import br.com.dosecerta.dose.certa.entity.Medico;
import br.com.dosecerta.dose.certa.service.MedicoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/medicos")
public class MedicoController {

    private final MedicoService service;

    public MedicoController(MedicoService service) {
        this.service = service;
    }

    @GetMapping
    public List<Medico> listar() {
        return service.listarTodos();
    }

    @PostMapping
    public Medico criar(@RequestBody Medico medico) {
        return service.salvar(medico);
    }

    @PutMapping("/{id}")
    public Medico atualizar(@PathVariable Long id, @RequestBody Medico medico) {
        return service.atualizar(id, medico);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
