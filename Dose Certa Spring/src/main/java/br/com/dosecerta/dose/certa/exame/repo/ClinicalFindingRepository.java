package br.com.dosecerta.dose.certa.exame.repo;

import br.com.dosecerta.dose.certa.exame.model.ClinicalFinding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClinicalFindingRepository extends JpaRepository<ClinicalFinding, Long> {
    List<ClinicalFinding> findByAnalysisIdOrderByIdAsc(Long analysisId);
}
