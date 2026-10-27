package br.com.dosecerta.dose.certa.exame.repo;

import br.com.dosecerta.dose.certa.exame.model.ExamAnalysis;
import br.com.dosecerta.dose.certa.exame.model.ExamEnums.AnalysisStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExamAnalysisRepository extends JpaRepository<ExamAnalysis, Long> {
    Optional<ExamAnalysis> findFirstByExamIdOrderByCreatedAtDescIdDesc(Long examId);

    List<ExamAnalysis> findByExamIdOrderByCreatedAtDescIdDesc(Long examId);

    Optional<ExamAnalysis> findFirstByExamIdAndStatusAndCreatedAtAfter(Long examId,
                                                                       AnalysisStatus status,
                                                                       LocalDateTime after);
}
