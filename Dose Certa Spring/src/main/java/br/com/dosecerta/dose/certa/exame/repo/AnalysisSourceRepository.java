package br.com.dosecerta.dose.certa.exame.repo;

import br.com.dosecerta.dose.certa.exame.model.AnalysisSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnalysisSourceRepository extends JpaRepository<AnalysisSource, Long> {
    List<AnalysisSource> findByAnalysisIdOrderByIdAsc(Long analysisId);
}
