package br.com.dosecerta.dose.certa.controller;

import br.com.dosecerta.dose.certa.entity.Medicamento;
import br.com.dosecerta.dose.certa.service.MedicamentoService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/medicamentos")
public class MedicamentoController {

    private final MedicamentoService service;

    public MedicamentoController(MedicamentoService service) {
        this.service = service;
    }

    @PostMapping
    public Medicamento criar(@RequestBody Medicamento medicamento) {
        return service.salvar(medicamento);
    }

    @GetMapping
    public List<Medicamento> listar() {
        return service.listarTodos();
    }
}
