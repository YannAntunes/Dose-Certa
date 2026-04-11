package br.com.dosecerta.dose.certa.repository;

import br.com.dosecerta.dose.certa.entity.Medico;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MedicoRepository extends JpaRepository<Medico, Long> {
}
