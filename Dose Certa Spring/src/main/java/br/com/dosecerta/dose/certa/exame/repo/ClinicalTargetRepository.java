package br.com.dosecerta.dose.certa.exame.repo;

import br.com.dosecerta.dose.certa.exame.model.ClinicalTarget;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClinicalTargetRepository extends JpaRepository<ClinicalTarget, Long> {
    List<ClinicalTarget> findByTestCode(String testCode);
}
