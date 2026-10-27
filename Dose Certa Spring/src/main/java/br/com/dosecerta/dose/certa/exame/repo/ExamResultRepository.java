package br.com.dosecerta.dose.certa.exame.repo;

import br.com.dosecerta.dose.certa.exame.model.ExamEnums.ExamStatus;
import br.com.dosecerta.dose.certa.exame.model.ExamResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface ExamResultRepository extends JpaRepository<ExamResult, Long> {
    List<ExamResult> findByExamIdOrderByIdAsc(Long examId);

    long countByExamIdAndHistoricalFalse(Long examId);

    void deleteByExamId(Long examId);

    /** Resultados numericos do mesmo paciente e teste, restritos a exames processados. */
    @Query("select r from ExamResult r join fetch r.exam e where e.paciente.id = :patientId "
            + "and r.testCode = :code and r.numericValue is not null and r.resultDate is not null "
            + "and e.status in :statuses")
    List<ExamResult> findNumericByPatientAndCode(@Param("patientId") Long patientId,
                                                 @Param("code") String code,
                                                 @Param("statuses") Collection<ExamStatus> statuses);

    /** Todos os resultados numericos de um paciente em exames processados, para composicao de graficos temporais. */
    @Query("select r from ExamResult r join fetch r.exam e where e.paciente.id = :patientId "
            + "and r.testCode is not null and r.numericValue is not null and r.resultDate is not null "
            + "and e.status in :statuses order by r.resultDate asc, r.id asc")
    List<ExamResult> findAllNumericByPatient(@Param("patientId") Long patientId,
                                             @Param("statuses") Collection<ExamStatus> statuses);
}
