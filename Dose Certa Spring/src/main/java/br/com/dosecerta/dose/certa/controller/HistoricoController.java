package br.com.dosecerta.dose.certa.controller;

import br.com.dosecerta.dose.certa.dto.ConsultaDTO;
import br.com.dosecerta.dose.certa.entity.Consulta;
import br.com.dosecerta.dose.certa.service.ConsultaService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/historico")
public class HistoricoController {

    private final ConsultaService consultaService;

    public HistoricoController(ConsultaService consultaService) {
        this.consultaService = consultaService;
    }

    @GetMapping
    public List<ConsultaDTO> listar() {
        List<Consulta> consultas = consultaService.listar();
        return consultas.stream()
                .map(ConsultaDTO::new)
                .toList();
    }

    @GetMapping("/paciente/{pacienteId}")
    public List<ConsultaDTO> listarPorPaciente(@PathVariable Long pacienteId) {
        List<Consulta> consultas = consultaService.listarPorPaciente(pacienteId);
        return consultas.stream()
                .map(ConsultaDTO::new)
                .toList();
    }
}
