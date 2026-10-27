package br.com.dosecerta.dose.certa.exame.history;

import br.com.dosecerta.dose.certa.exame.history.HistoryService.HistoryPoint;
import br.com.dosecerta.dose.certa.exame.model.ExamResult;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class HistoryServiceTest {

    private static ExamResult r(Long id, String value, String unit, LocalDate date, boolean historical) {
        ExamResult x = new ExamResult();
        x.setId(id);
        x.setTestCode("GLUCOSE");
        x.setNumericValue(new BigDecimal(value));
        x.setNormalizedUnit(unit);
        x.setResultDate(date);
        x.setHistorical(historical);
        return x;
    }

    @Test
    void ordersChronologicallyAndExcludesCurrentAndFuture() {
        ExamResult current = r(10L, "92", "mg/dL", LocalDate.of(2024, 3, 12), false);
        List<HistoryPoint> pts = HistoryService.select(List.of(
                current,
                r(2L, "110", "mg/dL", LocalDate.of(2023, 6, 1), false),
                r(1L, "98", "mg/dL", LocalDate.of(2022, 1, 1), false),
                r(3L, "120", "mg/dL", LocalDate.of(2025, 1, 1), false)), current);
        assertEquals(2, pts.size());
        assertEquals(LocalDate.of(2022, 1, 1), pts.get(0).date());
        assertEquals(LocalDate.of(2023, 6, 1), pts.get(1).date());
    }

    @Test
    void incompatibleOrUnknownUnitsAreNotComparable() {
        ExamResult current = r(10L, "92", "mg/dL", LocalDate.of(2024, 3, 12), false);
        assertTrue(HistoryService.select(List.of(
                r(1L, "5", "mmol/L", LocalDate.of(2023, 1, 1), false),
                r(2L, "98", null, LocalDate.of(2023, 2, 1), true)), current).isEmpty());
    }

    @Test
    void duplicatesBetweenHistoricalTableAndPriorExamAreCollapsed() {
        ExamResult current = r(10L, "92", "mg/dL", LocalDate.of(2024, 3, 12), false);
        List<HistoryPoint> pts = HistoryService.select(List.of(
                r(1L, "98.0", "mg/dL", LocalDate.of(2023, 1, 10), true),
                r(2L, "98", "mg/dL", LocalDate.of(2023, 1, 10), false)), current);
        assertEquals(1, pts.size());
    }

    @Test
    void noComparableHistoryYieldsEmptyList() {
        ExamResult current = r(10L, "92", "mg/dL", LocalDate.of(2024, 3, 12), false);
        assertTrue(HistoryService.select(List.of(current), current).isEmpty());
    }
}
