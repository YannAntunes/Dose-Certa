package br.com.dosecerta.dose.certa.exame;

import br.com.dosecerta.dose.certa.entity.Paciente;
import br.com.dosecerta.dose.certa.exame.ai.GeminiClient;
import br.com.dosecerta.dose.certa.exame.ai.GeminiException;
import br.com.dosecerta.dose.certa.exame.history.HistoryService;
import br.com.dosecerta.dose.certa.exame.model.ClinicalTarget;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.AnalysisStatus;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.ExamStatus;
import br.com.dosecerta.dose.certa.exame.model.ExamResult;
import br.com.dosecerta.dose.certa.exame.repo.*;
import br.com.dosecerta.dose.certa.repository.PacienteRepository;
import br.com.dosecerta.dose.certa.security.JwtService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** Integracao do modulo de exames: H2 em memoria (modo PostgreSQL), Gemini mockado, JWT real. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ExamModuleIntegrationTest {

    private static final AtomicLong SEQ = new AtomicLong(System.nanoTime());
    private static final String DISCLAIMER_FRAGMENT = "nao constitui diagnostico";

    @Autowired MockMvc mvc;
    @Autowired JwtService jwt;
    @Autowired PacienteRepository pacientes;
    @Autowired ExamRepository exams;
    @Autowired ExamResultRepository results;
    @Autowired ExamAnalysisRepository analyses;
    @Autowired ClinicalFindingRepository findings;
    @Autowired ClinicalTargetRepository targets;
    @Autowired HistoryService history;
    @Autowired ObjectMapper mapper;
    @MockBean GeminiClient gemini;

    // ---------- helpers ----------

    private Paciente patient(String name) {
        Paciente p = new Paciente();
        p.setNome(name);
        p.setCpf("999" + SEQ.incrementAndGet());
        p.setIdade(40);
        p.setPeso(70);
        return pacientes.save(p);
    }

    private String bearer(String perfil) {
        return "Bearer " + jwt.gerarToken("teste-" + perfil, perfil);
    }

    private MockHttpServletRequestBuilder upload(Long patientId, String filename, byte[] content, String perfil) {
        return multipart("/api/v1/exams")
                .file(new MockMultipartFile("file", filename, "application/pdf", content))
                .param("patientId", String.valueOf(patientId))
                .header("Authorization", bearer(perfil));
    }

    private JsonNode uploadOk(Paciente p, String date, String glucose) throws Exception {
        MvcResult r = mvc.perform(upload(p.getId(), "laudo.pdf", TestPdfs.labReport(date, glucose, SEQ.incrementAndGet()), "MEDICO"))
                .andReturn();
        assertEquals(201, r.getResponse().getStatus(), r.getResponse().getContentAsString());
        return mapper.readTree(r.getResponse().getContentAsString());
    }

    private static String aiJson(String type, String key) {
        return """
                {"status":"COMPLETED","summary":"Resumo de apoio.","findings":[{"resultKey":"%s","type":"%s",
                "severity":"INFO","title":"Glicemia","description":"Descricao.","sourceIds":[]}],
                "trends":[],"clinicalConsiderations":["Avaliar no contexto clinico."],"warnings":["Revisar extracao."],"sources":[]}
                """.formatted(key, type);
    }

    private void aiConfigured() {
        when(gemini.isConfigured()).thenReturn(true);
        when(gemini.modelId()).thenReturn("gemini-test");
    }

    // ---------- seguranca ----------

    @Test
    void uploadWithoutTokenIsRejected() throws Exception {
        Paciente p = patient("Paciente Sem Token");
        int s = mvc.perform(multipart("/api/v1/exams")
                .file(new MockMultipartFile("file", "a.pdf", "application/pdf", TestPdfs.blankPdf()))
                .param("patientId", p.getId().toString())).andReturn().getResponse().getStatus();
        assertTrue(s == 401 || s == 403, "status=" + s);
    }

    @Test
    void receptionistHasNoAccessToClinicalExams() throws Exception {
        Paciente p = patient("Paciente Recepcao");
        assertEquals(403, mvc.perform(upload(p.getId(), "a.pdf", TestPdfs.blankPdf(), "RECEPCAO"))
                .andReturn().getResponse().getStatus());
        assertEquals(403, mvc.perform(get("/api/v1/patients/" + p.getId() + "/exams")
                .header("Authorization", bearer("RECEPCAO"))).andReturn().getResponse().getStatus());
    }

    @Test
    void nurseCannotTriggerAiAnalysis() throws Exception {
        assertEquals(403, mvc.perform(post("/api/v1/exams/1/analyze")
                .header("Authorization", bearer("ENFERMEIRO"))).andReturn().getResponse().getStatus());
    }

    // ---------- upload e persistencia ----------

    @Test
    void validUploadIsStoredParsedAndEvaluated() throws Exception {
        Paciente p = patient("Paciente Valido");
        JsonNode summary = uploadOk(p, "12/03/2024", "92");
        assertEquals("PROCESSED", summary.get("status").asText());
        assertEquals(p.getId(), summary.get("patientId").asLong());
        assertTrue(summary.get("resultCount").asLong() >= 5);

        long examId = summary.get("id").asLong();
        MvcResult res = mvc.perform(get("/api/v1/exams/" + examId + "/results")
                .header("Authorization", bearer("ENFERMEIRO"))).andReturn();
        assertEquals(200, res.getResponse().getStatus());
        JsonNode arr = mapper.readTree(res.getResponse().getContentAsString());
        assertEquals("WITHIN_REFERENCE", byCode(arr, "GLUCOSE").get("status").asText());
        assertEquals("ABOVE_REFERENCE", byCode(arr, "CHOL_TOTAL").get("status").asText());
        assertEquals("WITHIN_REFERENCE", byCode(arr, "LEUKOCYTES").get("status").asText());
        assertEquals("92", byCode(arr, "GLUCOSE").get("numericValue").asText().replaceAll("\\.0+$", ""));
        assertEquals("70 a 99", byCode(arr, "GLUCOSE").get("referenceText").asText());

        MvcResult detail = mvc.perform(get("/api/v1/exams/" + examId)
                .header("Authorization", bearer("MEDICO"))).andReturn();
        JsonNode d = mapper.readTree(detail.getResponse().getContentAsString());
        assertEquals("Laboratorio Sintetico de Teste", d.get("exam").get("laboratory").asText());
        assertEquals("2024-03-12", d.get("exam").get("collectionDate").asText());
        assertFalse(d.toString().contains("storageKey"), "chave interna de arquivo nao deve ser exposta");
    }

    private static JsonNode byCode(JsonNode arr, String code) {
        for (JsonNode n : arr) if (code.equals(n.path("testCode").asText())) return n;
        throw new AssertionError("resultado nao encontrado: " + code);
    }

    @Test
    void invalidFilesAreRejected() throws Exception {
        Paciente p = patient("Paciente Invalido");
        assertEquals(400, mvc.perform(upload(p.getId(), "laudo.txt", "texto".getBytes(StandardCharsets.UTF_8), "MEDICO"))
                .andReturn().getResponse().getStatus());
        assertEquals(400, mvc.perform(upload(p.getId(), "falso.pdf", "isto nao e pdf".getBytes(StandardCharsets.UTF_8), "MEDICO"))
                .andReturn().getResponse().getStatus());
        assertEquals(400, mvc.perform(upload(p.getId(), "vazio.pdf", new byte[0], "MEDICO"))
                .andReturn().getResponse().getStatus());
        assertEquals(400, mvc.perform(multipart("/api/v1/exams")
                .file(new MockMultipartFile("file", "a.pdf", "application/pdf", TestPdfs.blankPdf()))
                .param("patientId", p.getId().toString()).param("sex", "X")
                .header("Authorization", bearer("MEDICO"))).andReturn().getResponse().getStatus());
    }

    @Test
    void unknownPatientReturns404() throws Exception {
        assertEquals(404, mvc.perform(upload(987654321L, "a.pdf", TestPdfs.blankPdf(), "MEDICO"))
                .andReturn().getResponse().getStatus());
    }

    @Test
    void corruptedAndScannedPdfsBecomeErrorWithoutResults() throws Exception {
        Paciente p = patient("Paciente Erro");
        byte[] corrupt = ("%PDF-1.4 lixo " + SEQ.incrementAndGet()).getBytes(StandardCharsets.ISO_8859_1);
        JsonNode c = mapper.readTree(mvc.perform(upload(p.getId(), "x.pdf", corrupt, "MEDICO"))
                .andReturn().getResponse().getContentAsString());
        assertEquals("ERROR", c.get("status").asText());
        assertEquals(0, c.get("resultCount").asInt());

        JsonNode s = mapper.readTree(mvc.perform(upload(p.getId(), "scan.pdf", TestPdfs.blankPdf(), "MEDICO"))
                .andReturn().getResponse().getContentAsString());
        assertEquals("ERROR", s.get("status").asText());
        assertTrue(s.get("errorMessage").asText().contains("OCR"));
    }

    @Test
    void pdfWithoutIdentifiableResultsBecomesError() throws Exception {
        Paciente p = patient("Paciente Sem Resultados");
        byte[] pdf = TestPdfs.textPdf(List.of("Documento qualquer sem exames " + SEQ.incrementAndGet()));
        JsonNode n = mapper.readTree(mvc.perform(upload(p.getId(), "n.pdf", pdf, "MEDICO"))
                .andReturn().getResponse().getContentAsString());
        assertEquals("ERROR", n.get("status").asText());
        assertEquals(0, n.get("resultCount").asInt());
    }

    @Test
    void duplicateUploadForSamePatientReturns409() throws Exception {
        Paciente p = patient("Paciente Duplicado");
        byte[] pdf = TestPdfs.labReport("12/03/2024", "92", SEQ.incrementAndGet());
        assertEquals(201, mvc.perform(upload(p.getId(), "a.pdf", pdf, "MEDICO")).andReturn().getResponse().getStatus());
        assertEquals(409, mvc.perform(upload(p.getId(), "a.pdf", pdf, "MEDICO")).andReturn().getResponse().getStatus());
    }

    // ---------- isolamento entre pacientes ----------

    @Test
    void examsAreListedOnlyForTheirOwnPatient() throws Exception {
        Paciente a = patient("Paciente A");
        Paciente b = patient("Paciente B");
        long examA = uploadOk(a, "12/03/2024", "92").get("id").asLong();

        JsonNode listA = mapper.readTree(mvc.perform(get("/api/v1/patients/" + a.getId() + "/exams")
                .header("Authorization", bearer("MEDICO"))).andReturn().getResponse().getContentAsString());
        JsonNode listB = mapper.readTree(mvc.perform(get("/api/v1/patients/" + b.getId() + "/exams")
                .header("Authorization", bearer("MEDICO"))).andReturn().getResponse().getContentAsString());
        assertEquals(1, listA.get("content").size());
        assertEquals(examA, listA.get("content").get(0).get("id").asLong());
        assertEquals(0, listB.get("content").size());
        assertEquals(404, mvc.perform(get("/api/v1/patients/99999999/exams")
                .header("Authorization", bearer("MEDICO"))).andReturn().getResponse().getStatus());
        assertEquals(404, mvc.perform(get("/api/v1/exams/99999999")
                .header("Authorization", bearer("MEDICO"))).andReturn().getResponse().getStatus());
    }

    @Test
    void historyNeverMixesPatients() throws Exception {
        Paciente a = patient("Historico A");
        Paciente b = patient("Historico B");
        uploadOk(a, "01/01/2023", "100");
        uploadOk(b, "05/05/2023", "300");
        long currentExam = uploadOk(a, "12/03/2024", "92").get("id").asLong();

        ExamResult current = results.findByExamIdOrderByIdAsc(currentExam).stream()
                .filter(r -> "GLUCOSE".equals(r.getTestCode())).findFirst().orElseThrow();
        var points = history.comparable(a.getId(), current);
        assertEquals(1, points.size());
        assertEquals(0, new BigDecimal("100").compareTo(points.get(0).value()));
    }

    // ---------- analise com Gemini mockado ----------

    @Test
    void successfulAnalysisIsValidatedPersistedAndPreservedAcrossRuns() throws Exception {
        aiConfigured();
        when(gemini.generate(any(), any(), any())).thenReturn(aiJson("WITHIN_REFERENCE", "GLUCOSE"));
        Paciente p = patient("Paciente Nome Completo Secreto");
        p.setCpf("12345678900-" + SEQ.incrementAndGet());
        pacientes.save(p);
        ClinicalTarget t = new ClinicalTarget();
        t.setTestCode("GLUCOSE");
        t.setCriterion("Meta sintetica de teste");
        t.setSourceTitle("Diretriz sintetica");
        targets.save(t);
        long examId = uploadOk(p, "12/03/2024", "92").get("id").asLong();

        MvcResult r1 = mvc.perform(post("/api/v1/exams/" + examId + "/analyze")
                .header("Authorization", bearer("MEDICO"))).andReturn();
        assertEquals(200, r1.getResponse().getStatus(), r1.getResponse().getContentAsString());
        JsonNode a1 = mapper.readTree(r1.getResponse().getContentAsString());
        assertEquals("COMPLETED", a1.get("status").asText());
        assertEquals("gemini-test", a1.get("modelId").asText());
        assertTrue(a1.get("disclaimer").asText().contains(DISCLAIMER_FRAGMENT));
        assertEquals(2, a1.get("findings").size()); // 1 achado + 1 consideracao clinica
        assertEquals(0, a1.get("sources").size());
        assertEquals(ExamStatus.ANALYZED, exams.findById(examId).orElseThrow().getStatus());

        // contexto enviado: sem dados pessoais; meta clinica listada como NAO aplicada
        ArgumentCaptor<String> prompt = ArgumentCaptor.forClass(String.class);
        verify(gemini).generate(any(), prompt.capture(), any());
        assertFalse(prompt.getValue().contains("Nome Completo Secreto"));
        assertFalse(prompt.getValue().contains("12345678900"));
        assertFalse(prompt.getValue().contains("laudo.pdf"));
        assertTrue(prompt.getValue().contains("clinicalTargetsNotApplied"));
        assertTrue(prompt.getValue().contains("Meta sintetica de teste"));

        MvcResult r2 = mvc.perform(post("/api/v1/exams/" + examId + "/analyze")
                .header("Authorization", bearer("ADMIN"))).andReturn();
        assertEquals(200, r2.getResponse().getStatus());
        assertEquals(2, analyses.findAll().stream().filter(a -> a.getExam().getId().equals(examId)).count());

        JsonNode latest = mapper.readTree(mvc.perform(get("/api/v1/exams/" + examId + "/analyses/latest")
                .header("Authorization", bearer("ENFERMEIRO"))).andReturn().getResponse().getContentAsString());
        assertEquals(mapper.readTree(r2.getResponse().getContentAsString()).get("id").asLong(), latest.get("id").asLong());
    }

    @Test
    void invalidAiResponseIsNotPersistedAsCompletedAnalysis() throws Exception {
        aiConfigured();
        // IA contradiz o status deterministico (glicemia 92 esta dentro da referencia)
        when(gemini.generate(any(), any(), any())).thenReturn(aiJson("ABOVE_REFERENCE", "GLUCOSE"));
        Paciente p = patient("Paciente IA Invalida");
        long examId = uploadOk(p, "12/03/2024", "92").get("id").asLong();

        MvcResult r = mvc.perform(post("/api/v1/exams/" + examId + "/analyze")
                .header("Authorization", bearer("MEDICO"))).andReturn();
        assertEquals(502, r.getResponse().getStatus());
        assertTrue(r.getResponse().getContentAsString().contains("AI_INVALID_RESPONSE"));

        var last = analyses.findFirstByExamIdOrderByCreatedAtDescIdDesc(examId).orElseThrow();
        assertEquals(AnalysisStatus.ERROR, last.getStatus());
        assertNull(last.getSummary());
        assertTrue(findings.findByAnalysisIdOrderByIdAsc(last.getId()).isEmpty());
        assertEquals(ExamStatus.PROCESSED, exams.findById(examId).orElseThrow().getStatus());
    }

    @Test
    void providerFailureLeavesExamAndResultsIntact() throws Exception {
        aiConfigured();
        when(gemini.generate(any(), any(), any()))
                .thenThrow(new GeminiException(GeminiException.Kind.TIMEOUT, "Tempo limite excedido ao consultar o provedor de IA.", true));
        Paciente p = patient("Paciente Timeout");
        long examId = uploadOk(p, "12/03/2024", "92").get("id").asLong();
        long before = results.findByExamIdOrderByIdAsc(examId).size();

        MvcResult r = mvc.perform(post("/api/v1/exams/" + examId + "/analyze")
                .header("Authorization", bearer("MEDICO"))).andReturn();
        assertEquals(504, r.getResponse().getStatus());
        assertTrue(mapper.readTree(r.getResponse().getContentAsString()).get("recoverable").asBoolean());
        assertEquals(ExamStatus.PROCESSED, exams.findById(examId).orElseThrow().getStatus());
        assertEquals(before, results.findByExamIdOrderByIdAsc(examId).size());
        assertEquals(AnalysisStatus.ERROR,
                analyses.findFirstByExamIdOrderByCreatedAtDescIdDesc(examId).orElseThrow().getStatus());
    }

    @Test
    void analysisIsRefusedWhenAiIsNotConfiguredOrExamNotProcessed() throws Exception {
        when(gemini.isConfigured()).thenReturn(false);
        Paciente p = patient("Paciente Sem IA");
        long examId = uploadOk(p, "12/03/2024", "92").get("id").asLong();
        assertEquals(503, mvc.perform(post("/api/v1/exams/" + examId + "/analyze")
                .header("Authorization", bearer("MEDICO"))).andReturn().getResponse().getStatus());
        assertTrue(analyses.findFirstByExamIdOrderByCreatedAtDescIdDesc(examId).isEmpty());

        aiConfigured();
        JsonNode err = mapper.readTree(mvc.perform(upload(p.getId(), "scan.pdf", TestPdfs.blankPdf(), "MEDICO"))
                .andReturn().getResponse().getContentAsString());
        assertEquals(409, mvc.perform(post("/api/v1/exams/" + err.get("id").asLong() + "/analyze")
                .header("Authorization", bearer("MEDICO"))).andReturn().getResponse().getStatus());
    }

    @Test
    void latestAnalysisReturns404WhenNoneExists() throws Exception {
        Paciente p = patient("Paciente Sem Analise");
        long examId = uploadOk(p, "12/03/2024", "92").get("id").asLong();
        assertEquals(404, mvc.perform(get("/api/v1/exams/" + examId + "/analyses/latest")
                .header("Authorization", bearer("MEDICO"))).andReturn().getResponse().getStatus());
    }
}
