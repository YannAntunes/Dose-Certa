package br.com.dosecerta.dose.certa.controller;

import br.com.dosecerta.dose.certa.entity.Medico;
import br.com.dosecerta.dose.certa.service.MedicoService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/medicos")
public class MedicoController {

    private final MedicoService service;

    public MedicoController(MedicoService service) {
        this.service = service;
    }

    @PostMapping
    public Medico criar(@RequestBody Medico medico) {
        return service.salvar(medico);
    }

    @GetMapping
    public List<Medico> listar() {
        return service.listarTodos();
    }
}
