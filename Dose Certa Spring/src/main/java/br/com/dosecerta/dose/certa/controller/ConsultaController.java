package br.com.dosecerta.dose.certa.controller;

import br.com.dosecerta.dose.certa.dto.ConsultaDTO;
import br.com.dosecerta.dose.certa.dto.ConsultaRequestDTO;
import br.com.dosecerta.dose.certa.entity.*;
import br.com.dosecerta.dose.certa.repository.*;
import br.com.dosecerta.dose.certa.service.ConsultaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;

@Tag(name = "Consultas", description = "Cálculo e histórico de dosagem de medicamentos")
@RestController
@RequestMapping("/consultas")
public class ConsultaController {


    private final ConsultaService consultaService;
    private final PacienteRepository pacienteRepository;
    private final MedicamentoRepository medicamentoRepository;
    private final MedicoRepository medicoRepository;
    private final EnfermeiroRepository enfermeiroRepository;

    public ConsultaController(
            ConsultaService consultaService,
            PacienteRepository pacienteRepository,
            MedicamentoRepository medicamentoRepository,
            MedicoRepository medicoRepository,
            EnfermeiroRepository enfermeiroRepository
    ) {
        this.consultaService = consultaService;
        this.pacienteRepository = pacienteRepository;
        this.medicamentoRepository = medicamentoRepository;
        this.medicoRepository = medicoRepository;
        this.enfermeiroRepository = enfermeiroRepository;
    }

    @Operation(
            summary = "Realizar cálculo de dosagem",
            description = "Calcula a dosagem do medicamento com validação de dose máxima"
    )
    @ApiResponse(responseCode = "201", description = "Consulta criada com sucesso")
    @ApiResponse(responseCode = "400", description = "Dados inválidos ou regra clínica violada")
    @PostMapping
    public ResponseEntity<ConsultaDTO> criar(
            @RequestBody ConsultaRequestDTO request
    ) {

        Paciente paciente = pacienteRepository.findById(request.getPacienteId())
                .orElseThrow(() -> new IllegalArgumentException("Paciente não encontrado"));

        Medicamento medicamento = medicamentoRepository.findById(request.getMedicamentoId())
                .orElseThrow(() -> new IllegalArgumentException("Medicamento não encontrado"));

        Medico medico = null;
        Enfermeiro enfermeiro = null;

        if (request.getMedicoId() != null) {
            medico = medicoRepository.findById(request.getMedicoId())
                    .orElseThrow(() -> new IllegalArgumentException("Médico não encontrado"));
        }

        if (request.getEnfermeiroId() != null) {
            enfermeiro = enfermeiroRepository.findById(request.getEnfermeiroId())
                    .orElseThrow(() -> new IllegalArgumentException("Enfermeiro não encontrado"));
        }

        if (medico == null && enfermeiro == null) {
            throw new IllegalArgumentException("Informe médico ou enfermeiro");
        }

        Consulta consulta = consultaService.salvar(
                paciente,
                medicamento,
                medico,
                enfermeiro,
                request.getTipoCalculo()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(new ConsultaDTO(consulta));
    }
}
