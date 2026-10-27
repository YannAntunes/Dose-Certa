package br.com.dosecerta.dose.certa.exame.history;

import br.com.dosecerta.dose.certa.exame.model.ExamEnums.ExamStatus;
import br.com.dosecerta.dose.certa.exame.model.ExamResult;
import br.com.dosecerta.dose.certa.exame.repo.ExamResultRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * Historico comparavel de um resultado: mesmo paciente, mesmo codigo de teste, mesma unidade normalizada
 * (unidade desconhecida => nao comparavel), data anterior a do resultado atual, sem duplicatas.
 */
@Service
public class HistoryService {

    public record HistoryPoint(LocalDate date, BigDecimal value, String unit) {}

    private final ExamResultRepository results;

    public HistoryService(ExamResultRepository results) {
        this.results = results;
    }

    @Transactional(readOnly = true)
    public List<HistoryPoint> comparable(Long patientId, ExamResult current) {
        if (current.getTestCode() == null || current.getNumericValue() == null
                || current.getNormalizedUnit() == null || current.getResultDate() == null) {
            return List.of();
        }
        List<ExamResult> candidates = results.findNumericByPatientAndCode(patientId, current.getTestCode(),
                List.of(ExamStatus.PROCESSED, ExamStatus.ANALYZED));
        return select(candidates, current);
    }

    /** Parte pura (testavel): filtra, deduplica e ordena cronologicamente. */
    public static List<HistoryPoint> select(Collection<ExamResult> candidates, ExamResult current) {
        // dedupe por (data, valor, unidade): resultado nao-historico prevalece sobre o historico duplicado
        Map<String, ExamResult> byKey = new LinkedHashMap<>();
        for (ExamResult c : candidates) {
            if (Objects.equals(c.getId(), current.getId())) continue;
            if (c.getNormalizedUnit() == null || !c.getNormalizedUnit().equals(current.getNormalizedUnit())) continue;
            if (c.getResultDate() == null || !c.getResultDate().isBefore(current.getResultDate())) continue;
            String key = c.getResultDate() + "|" + c.getNumericValue().stripTrailingZeros().toPlainString();
            ExamResult prev = byKey.get(key);
            if (prev == null || (prev.isHistorical() && !c.isHistorical())) byKey.put(key, c);
        }
        return byKey.values().stream()
                .sorted(Comparator.comparing(ExamResult::getResultDate))
                .map(r -> new HistoryPoint(r.getResultDate(), r.getNumericValue(), r.getNormalizedUnit()))
                .toList();
    }
}
