package br.com.dosecerta.dose.certa.controller;

import br.com.dosecerta.dose.certa.dto.PacienteDTO;
import br.com.dosecerta.dose.certa.entity.Paciente;
import br.com.dosecerta.dose.certa.service.PacienteService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/pacientes")
public class PacienteController {

    private final PacienteService service;

    public PacienteController(PacienteService service) {
        this.service = service;
    }

    @PostMapping
    public PacienteDTO criar(@RequestBody Paciente paciente) {
        return new PacienteDTO(service.salvar(paciente));
    }

    @GetMapping
    public List<PacienteDTO> listar() {
        return service.listarTodos()
                .stream()
                .map(PacienteDTO::new)
                .toList();
    }
}
