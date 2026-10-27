package br.com.dosecerta.dose.certa.exame.repo;

import br.com.dosecerta.dose.certa.exame.model.ReferenceRange;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReferenceRangeRepository extends JpaRepository<ReferenceRange, Long> {
    List<ReferenceRange> findByTestCode(String testCode);
}
