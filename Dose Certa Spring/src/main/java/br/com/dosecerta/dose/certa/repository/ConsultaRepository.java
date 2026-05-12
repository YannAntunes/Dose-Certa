package br.com.dosecerta.dose.certa.repository;

import br.com.dosecerta.dose.certa.entity.Consulta;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConsultaRepository extends JpaRepository<Consulta, Long> {
    java.util.List<Consulta> findAllByOrderByDataHoraDesc();
}
