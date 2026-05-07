-- Script para criar usuários de teste no banco de dados
-- Execute este script no seu banco PostgreSQL

-- Tabela de usuarios (se não existir)
CREATE TABLE IF NOT EXISTS usuarios (
    id BIGSERIAL PRIMARY KEY,
    login VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    perfil VARCHAR(50) NOT NULL
);

-- Limpar dados antigos (opcional)
-- TRUNCATE TABLE usuarios CASCADE;

-- Inserir usuários de teste
INSERT INTO usuarios (login, senha, perfil) VALUES
    ('admin', 'admin123', 'ADMINISTRADOR'),
    ('medico', 'medico123', 'MEDICO'),
    ('enfermeiro', 'enfermeiro123', 'ENFERMEIRO'),
    ('recepcao', 'recepcao123', 'RECEPCAO')
ON CONFLICT (login) DO NOTHING;

-- Verificar se foram inseridos
SELECT * FROM usuarios;
