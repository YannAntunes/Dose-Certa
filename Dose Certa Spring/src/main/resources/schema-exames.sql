-- =============================================================================
-- DOSE CERTA — MODULO DE ANALISE INTELIGENTE DE EXAMES
-- Script DDL Idempotente para PostgreSQL
-- Preserva tabelas existentes e integra com a tabela 'pacientes'
-- =============================================================================

-- 1. Tabela: exams
CREATE TABLE IF NOT EXISTS exams (
    id BIGSERIAL PRIMARY KEY,
    paciente_id BIGINT NOT NULL REFERENCES pacientes(id) ON DELETE RESTRICT,
    laboratory VARCHAR(255),
    collection_date DATE,
    release_date DATE,
    original_filename VARCHAR(255) NOT NULL,
    storage_key VARCHAR(255) NOT NULL UNIQUE,
    file_sha256 VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL,
    sex VARCHAR(1),
    error_message VARCHAR(500),
    processing_notes VARCHAR(1000),
    uploaded_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_exams_paciente_hash UNIQUE (paciente_id, file_sha256)
);

CREATE INDEX IF NOT EXISTS idx_exams_paciente_coleta ON exams(paciente_id, collection_date);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);

-- 2. Tabela: exam_results
CREATE TABLE IF NOT EXISTS exam_results (
    id BIGSERIAL PRIMARY KEY,
    exam_id BIGINT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    test_code VARCHAR(40),
    original_name VARCHAR(200) NOT NULL,
    normalized_name VARCHAR(200),
    numeric_value NUMERIC(19, 6),
    text_value VARCHAR(100),
    original_unit VARCHAR(50),
    normalized_unit VARCHAR(50),
    reference_text VARCHAR(500),
    ref_lower NUMERIC(19, 6),
    ref_lower_op VARCHAR(2),
    ref_upper NUMERIC(19, 6),
    ref_upper_op VARCHAR(2),
    status VARCHAR(20) NOT NULL,
    status_justification VARCHAR(600),
    applied_reference VARCHAR(60),
    source_page INTEGER,
    source_snippet VARCHAR(300),
    confidence DOUBLE PRECISION NOT NULL,
    needs_review BOOLEAN NOT NULL,
    qualitative BOOLEAN NOT NULL,
    historical BOOLEAN NOT NULL,
    result_date DATE,
    notes VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_code_date ON exam_results(test_code, result_date);

-- 3. Tabela: reference_ranges
CREATE TABLE IF NOT EXISTS reference_ranges (
    id BIGSERIAL PRIMARY KEY,
    test_code VARCHAR(40) NOT NULL,
    origin VARCHAR(30) NOT NULL,
    laboratory VARCHAR(200),
    unit VARCHAR(50) NOT NULL,
    lower_bound NUMERIC(19, 6),
    lower_op VARCHAR(2),
    upper_bound NUMERIC(19, 6),
    upper_op VARCHAR(2),
    critical_low NUMERIC(19, 6),
    critical_high NUMERIC(19, 6),
    sex VARCHAR(1),
    age_min_years INTEGER,
    age_max_years INTEGER,
    conditions VARCHAR(500),
    source_title VARCHAR(300) NOT NULL,
    source_version VARCHAR(100),
    source_url VARCHAR(500),
    valid_from DATE,
    valid_to DATE,
    registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reference_ranges_code ON reference_ranges(test_code);

-- 4. Tabela: clinical_targets
CREATE TABLE IF NOT EXISTS clinical_targets (
    id BIGSERIAL PRIMARY KEY,
    test_code VARCHAR(40) NOT NULL,
    criterion VARCHAR(500) NOT NULL,
    clinical_condition VARCHAR(300),
    risk_category VARCHAR(200),
    unit VARCHAR(50),
    source_title VARCHAR(300) NOT NULL,
    guideline_version VARCHAR(100),
    valid_from DATE,
    valid_to DATE
);

CREATE INDEX IF NOT EXISTS idx_clinical_targets_code ON clinical_targets(test_code);

-- 5. Tabela: exam_analyses
CREATE TABLE IF NOT EXISTS exam_analyses (
    id BIGSERIAL PRIMARY KEY,
    exam_id BIGINT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    status VARCHAR(25) NOT NULL,
    summary TEXT,
    warnings TEXT,
    model_id VARCHAR(100),
    contract_version VARCHAR(50),
    error_message VARCHAR(500),
    requested_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exam_analyses_exam ON exam_analyses(exam_id, created_at);

-- 6. Tabela: clinical_findings
CREATE TABLE IF NOT EXISTS clinical_findings (
    id BIGSERIAL PRIMARY KEY,
    analysis_id BIGINT NOT NULL REFERENCES exam_analyses(id) ON DELETE CASCADE,
    exam_result_id BIGINT REFERENCES exam_results(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL,
    severity VARCHAR(15) NOT NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    source_keys VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_clinical_findings_analysis ON clinical_findings(analysis_id);

-- 7. Tabela: analysis_sources
CREATE TABLE IF NOT EXISTS analysis_sources (
    id BIGSERIAL PRIMARY KEY,
    analysis_id BIGINT NOT NULL REFERENCES exam_analyses(id) ON DELETE CASCADE,
    source_key VARCHAR(100) NOT NULL,
    title VARCHAR(300) NOT NULL,
    organization VARCHAR(200),
    source_type VARCHAR(50),
    version_id VARCHAR(100),
    url VARCHAR(500),
    excerpt TEXT,
    locator VARCHAR(100),
    accessed_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analysis_sources_analysis ON analysis_sources(analysis_id);
