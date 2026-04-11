package br.com.dosecerta.dose.certa.controller;

import br.com.dosecerta.dose.certa.entity.Enfermeiro;
import br.com.dosecerta.dose.certa.service.EnfermeiroService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/enfermeiros")
public class EnfermeiroController {

    private final EnfermeiroService service;

    public EnfermeiroController(EnfermeiroService service) {
        this.service = service;
    }

    @PostMapping
    public Enfermeiro criar(@RequestBody Enfermeiro enfermeiro) {
        return service.salvar(enfermeiro);
    }

    @GetMapping
    public List<Enfermeiro> listar() {
        return service.listarTodos();
    }
}
