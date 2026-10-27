package br.com.dosecerta.dose.certa.exame.ai;

import br.com.dosecerta.dose.certa.entity.Paciente;
import br.com.dosecerta.dose.certa.exame.history.HistoryService;
import br.com.dosecerta.dose.certa.exame.model.Exam;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.ResultStatus;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.Sex;
import br.com.dosecerta.dose.certa.exame.model.ExamResult;
import br.com.dosecerta.dose.certa.exame.repo.ClinicalTargetRepository;
import br.com.dosecerta.dose.certa.exame.repo.ExamResultRepository;
import br.com.dosecerta.dose.certa.repository.ConsultaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AnalysisContextBuilderTest {

    @Test
    void buildsContextWithAgeAndSexAndZeroPii() {
        ExamResultRepository results = mock(ExamResultRepository.class);
        ClinicalTargetRepository targets = mock(ClinicalTargetRepository.class);
        HistoryService history = mock(HistoryService.class);
        KnowledgeRetriever retriever = mock(KnowledgeRetriever.class);
        ObjectProvider<ConsultaRepository> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(null);
        when(retriever.retrieve(any())).thenReturn(List.of());

        Paciente p = new Paciente();
        p.setNome("Dr. Silveira Santos");
        p.setCpf("123.456.789-99");
        p.setIdade(58);
        p.setPeso(75.5);

        Exam exam = new Exam();
        exam.setId(10L);
        exam.setPaciente(p);
        exam.setSex(Sex.M);

        ExamResult r1 = new ExamResult();
        r1.setId(1L);
        r1.setTestCode("GLUCOSE");
        r1.setOriginalName("Glicose");
        r1.setNumericValue(new BigDecimal("95"));
        r1.setNormalizedUnit("mg/dL");
        r1.setStatus(ResultStatus.WITHIN_REFERENCE);

        when(results.findByExamIdOrderByIdAsc(10L)).thenReturn(List.of(r1));

        AnalysisContextBuilder builder = new AnalysisContextBuilder(
                results, targets, history, retriever, new ObjectMapper(), provider
        );

        String clinicalNotes = "Suspeita de fadiga crônica; paciente em uso de Losartana 50mg.";
        AnalysisContext ctx = builder.build(exam, clinicalNotes);

        assertNotNull(ctx);
        String json = ctx.userPrompt();

        // 1. Deve conter idade e sexo
        assertTrue(json.contains("58"), "Deve conter idade do paciente");
        assertTrue(json.contains("M"), "Deve conter sexo biológico");

        // 2. Deve conter as notas de contexto clínico
        assertTrue(json.contains(clinicalNotes), "Deve conter o contexto clínico informado pelo profissional");

        // 3. ZERO PII (LGPD Compliance)
        assertFalse(json.contains("Dr. Silveira Santos"), "Nome do paciente NUNCA deve ser enviado a IA");
        assertFalse(json.contains("123.456.789-99"), "CPF do paciente NUNCA deve ser enviado a IA");
    }
}
