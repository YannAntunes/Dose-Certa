package br.com.dosecerta.dose.certa.exame.web;

import br.com.dosecerta.dose.certa.exame.ExamException;
import br.com.dosecerta.dose.certa.exame.service.ExamAnalysisService;
import br.com.dosecerta.dose.certa.exame.service.ExamQueryService;
import br.com.dosecerta.dose.certa.exame.service.ExamUploadService;
import br.com.dosecerta.dose.certa.exame.web.ExamDtos.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * API de exames laboratoriais. Acesso por perfil configurado em SecurityConfig
 * (leitura: ADMIN/MEDICO/ENFERMEIRO; upload: idem; analise por IA: ADMIN/MEDICO).
 */
@RestController
@RequestMapping("/api/v1")
@Tag(name = "Exames", description = "Upload e analise assistida de exames laboratoriais (apoio a decisao clinica)")
public class ExamController {

    private static final Logger log = LoggerFactory.getLogger(ExamController.class);

    private final ExamUploadService uploads;
    private final ExamQueryService queries;
    private final ExamAnalysisService analyses;

    public ExamController(ExamUploadService uploads, ExamQueryService queries, ExamAnalysisService analyses) {
        this.uploads = uploads;
        this.queries = queries;
        this.analyses = analyses;
    }

    @Operation(summary = "Envia um PDF de exame para um paciente (201; 400/404/409/413/422 em caso de erro)")
    @PostMapping(value = "/exams", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ExamSummary> upload(@RequestParam("patientId") Long patientId,
                                              @RequestParam("file") MultipartFile file,
                                              @RequestParam(value = "sex", required = false) String sex,
                                              Authentication auth) {
        ExamSummary summary = uploads.upload(patientId, file, sex, auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(summary);
    }

    @Operation(summary = "Consulta metadados e resultados extraidos de um exame")
    @GetMapping("/exams/{id}")
    public ExamDetail get(@PathVariable Long id) {
        return queries.detail(id);
    }

    @Operation(summary = "Lista (paginado) os exames de um paciente")
    @GetMapping("/patients/{patientId}/exams")
    public Page<ExamSummary> listByPatient(@PathVariable Long patientId,
                                           @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return queries.listByPatient(patientId, pageable);
    }

    @Operation(summary = "Series de evolucao historica de analitos comparaveis para o prontuario do paciente")
    @GetMapping("/patients/{patientId}/evolution")
    public List<AnalyteEvolutionSeries> patientEvolution(@PathVariable Long patientId) {
        return queries.patientEvolution(patientId);
    }

    @Operation(summary = "Resultados identificados no exame")
    @GetMapping("/exams/{id}/results")
    public List<ResultDto> results(@PathVariable Long id) {
        return queries.results(id);
    }

    @Operation(summary = "Executa a analise assistida por IA (sincrona); preserva analises anteriores e aceita contexto clinico opcional")
    @PostMapping("/exams/{id}/analyze")
    public AnalysisDto analyze(@PathVariable Long id,
                               @RequestBody(required = false) ExamAnalysisRequest request,
                               Authentication auth) {
        String clinicalContext = request != null ? request.clinicalContext() : null;
        log.info("Analise solicitada: exame id={} usuario={} contextoClinicoPresente={}",
                id, auth.getName(), clinicalContext != null && !clinicalContext.isBlank());
        return analyses.analyze(id, auth.getName(), clinicalContext);
    }

    @Operation(summary = "Lista todas as analises realizadas para o exame")
    @GetMapping("/exams/{id}/analyses")
    public List<AnalysisDto> analyses(@PathVariable Long id) {
        return queries.listAnalyses(id);
    }

    @Operation(summary = "Analise mais recente do exame (404 se nao houver)")
    @GetMapping("/exams/{id}/analyses/latest")
    public AnalysisDto latest(@PathVariable Long id) {
        return queries.latestAnalysis(id).orElseThrow(() ->
                new ExamException(HttpStatus.NOT_FOUND, "ANALYSIS_NOT_FOUND", "Nenhuma analise encontrada para o exame."));
    }
}
