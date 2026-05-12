package br.com.dosecerta.dose.certa.controller;

import br.com.dosecerta.dose.certa.entity.Medicamento;
import br.com.dosecerta.dose.certa.service.MedicamentoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/medicamentos")
public class MedicamentoController {

    private final MedicamentoService service;

    public MedicamentoController(MedicamentoService service) {
        this.service = service;
    }

    @GetMapping
    public List<Medicamento> listar() {
        return service.listarTodos();
    }

    @PostMapping
    public Medicamento criar(@RequestBody Medicamento medicamento) {
        return service.salvar(medicamento);
    }

    @PutMapping("/{id}")
    public Medicamento atualizar(@PathVariable Long id, @RequestBody Medicamento medicamento) {
        return service.atualizar(id, medicamento);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
